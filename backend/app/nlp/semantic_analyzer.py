import os
import re
import uuid
from typing import List, Dict, Optional, Tuple, Any
import numpy as np
from backend.app.core.config import settings
from backend.app.core.logging import get_logger
from backend.app.schemas.specification import ParsedSpecification, EndpointDefinition
from backend.app.schemas.change import SemanticFinding
from backend.app.nlp.text_preprocessor import TextPreprocessor

logger = get_logger(__name__)

class SemanticAnalyzer:
    """
    NLP Semantic Diff Engine using Sentence Transformers and linguistic contract heuristics.
    Detects subtle natural language changes in API documentation, scope shifts, and semantic drift.
    """

    def __init__(self, model_name: Optional[str] = None):
        self.model_name = model_name or settings.EMBEDDING_MODEL_NAME
        self.similarity_threshold = settings.SIMILARITY_THRESHOLD_DRIFT
        self._model = None
        self._is_loading = False

    def load_model(self):
        if self._model is not None:
            return
        try:
            from sentence_transformers import SentenceTransformer
            fine_tuned_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "models", "student2_semantic"))
            model_to_load = fine_tuned_path if os.path.exists(fine_tuned_path) else self.model_name
            logger.info(f"Loading SentenceTransformer: {model_to_load}")
            self._model = SentenceTransformer(model_to_load)
            logger.info(f"SentenceTransformer model loaded successfully from {'fine-tuned checkpoint' if model_to_load == fine_tuned_path else self.model_name}.")
        except Exception as e:
            logger.warning(f"Could not load SentenceTransformer ({e}). Falling back to lexical vectors.")
            self._model = None

    @property
    def is_loaded(self) -> bool:
        return self._model is not None

    def encode(self, texts: List[str]) -> np.ndarray:
        cleaned = [TextPreprocessor.clean(t) for t in texts]
        if self._model is not None:
            return self._model.encode(cleaned, normalize_embeddings=True)
        # Fallback bag-of-words character n-gram / lexical embedding if model is absent
        vectors = []
        for text in cleaned:
            vec = np.zeros(384, dtype=np.float32)
            for i, ch in enumerate(text.lower()[:384]):
                vec[i % 384] += ord(ch) / 255.0
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec = vec / norm
            vectors.append(vec)
        return np.array(vectors, dtype=np.float32)

    def compute_similarity(self, text1: str, text2: str) -> float:
        c1 = TextPreprocessor.clean(text1)
        c2 = TextPreprocessor.clean(text2)
        if not c1 and not c2:
            return 1.0
        if not c1 or not c2:
            return 0.0
        if c1.lower() == c2.lower():
            return 1.0

        embeddings = self.encode([c1, c2])
        cosine_sim = float(np.dot(embeddings[0], embeddings[1]))
        return max(0.0, min(1.0, round(cosine_sim, 4)))

    def analyze_endpoints(
        self,
        v1_spec: ParsedSpecification,
        v2_spec: ParsedSpecification
    ) -> List[SemanticFinding]:
        findings: List[SemanticFinding] = []
        v1_map = v1_spec.endpoint_map
        v2_map = v2_spec.endpoint_map

        for key in set(v1_map.keys()) & set(v2_map.keys()):
            ep1 = v1_map[key]
            ep2 = v2_map[key]

            # 1. Endpoint description comparison
            desc1 = ep1.description or ep1.summary or ""
            desc2 = ep2.description or ep2.summary or ""
            if desc1 or desc2:
                finding = self.analyze_text_pair(
                    endpoint_path=ep1.path,
                    http_method=ep1.method,
                    field_name="operation_description",
                    old_text=desc1,
                    new_text=desc2
                )
                if finding:
                    findings.append(finding)

            # 2. Parameter descriptions comparison
            p1_dict = {f"{p.in_location}:{p.name}": p.description or "" for p in ep1.parameters}
            p2_dict = {f"{p.in_location}:{p.name}": p.description or "" for p in ep2.parameters}

            for p_key in set(p1_dict.keys()) & set(p2_dict.keys()):
                p_desc1 = p1_dict[p_key]
                p_desc2 = p2_dict[p_key]
                if p_desc1 or p_desc2:
                    p_finding = self.analyze_text_pair(
                        endpoint_path=ep1.path,
                        http_method=ep1.method,
                        field_name=f"parameter_description[{p_key}]",
                        old_text=p_desc1,
                        new_text=p_desc2
                    )
                    if p_finding:
                        findings.append(p_finding)

        return findings

    def analyze_text_pair(
        self,
        endpoint_path: str,
        http_method: str,
        field_name: str,
        old_text: str,
        new_text: str
    ) -> Optional[SemanticFinding]:
        c1 = TextPreprocessor.clean(old_text)
        c2 = TextPreprocessor.clean(new_text)

        # Identical text
        if c1 == c2:
            return None

        sim = self.compute_similarity(c1, c2)
        drift = round(1.0 - sim, 4)

        # Check for linguistic scope narrowing or contradictions
        contradiction_detected, contradiction_reason = self._detect_linguistic_conflict(c1, c2)

        meaning_change = (sim < self.similarity_threshold) or contradiction_detected
        requires_review = (sim < 0.85 and sim > 0.60) or contradiction_detected

        if not meaning_change and drift < 0.15:
            # Minor cosmetic rewording without meaning shift
            return None

        explanation = contradiction_reason if contradiction_reason else (
            f"Semantic similarity is {sim:.2f} (drift: {drift:.2f}). "
            f"The documentation exhibits notable natural language divergence."
        )

        return SemanticFinding(
            id=f"sem-{uuid.uuid4().hex[:8]}",
            endpoint_path=endpoint_path,
            http_method=http_method,
            field_name=field_name,
            old_text=old_text,
            new_text=new_text,
            similarity_score=sim,
            semantic_drift=drift,
            meaning_change_suspected=meaning_change,
            requires_review=requires_review,
            confidence=round(min(0.99, max(0.50, abs(sim - 0.70) + 0.60)), 2),
            explanation=explanation
        )

    def _detect_linguistic_conflict(self, old_text: str, new_text: str) -> Tuple[bool, Optional[str]]:
        """
        Applies transparent linguistic heuristics to identify scope narrowing, negation,
        deontic condition changes, and inclusion/exclusion contradictions.
        """
        t1 = old_text.lower()
        t2 = new_text.lower()

        # Pattern 1: Scope narrowing ("all products" -> "available products only")
        if ("all " in t1 or "every " in t1) and (" only" in t2 or "available " in t2 or "subset" in t2 or "filtered" in t2):
            return True, "The new description narrows the documented result set from all entities to a filtered/conditional subset."

        # Pattern 2: Authentication requirement flip
        if "optional" in t1 and "required" in t2:
            return True, "Authentication or prerequisite was documented as optional, but is now mandatory/required."
        if "required" in t1 and "optional" in t2:
            return True, "Prerequisite changed from required to optional."

        # Pattern 3: Inclusion vs Exclusion ("includes archived" -> "archived items are excluded")
        if ("include" in t1 or "includes" in t1) and ("exclude" in t2 or "excluded" in t2 or "omitted" in t2):
            return True, "Documentation shifted from including items to explicitly excluding them."

        # Pattern 4: State contradiction ("deleted records" -> "active records")
        if "deleted" in t1 and "active" in t2:
            return True, "Documented entity state shifted from deleted records to active records only."

        # Pattern 5: Negation flip ("retries automatically" -> "does not retry")
        if ("retries automatically" in t1 or "automatic retry" in t1) and ("does not retry" in t2 or "no retry" in t2 or "not retry" in t2):
            return True, "Documented retry guarantee was inverted (automatic retry disabled)."

        # Pattern 6: Synchronous to Asynchronous shift
        if ("synchronous" in t1 or "immediately" in t1) and ("asynchronous" in t2 or "queued" in t2 or "background" in t2):
            return True, "Execution model shifted from immediate/synchronous settlement to asynchronous job queue."

        return False, None
