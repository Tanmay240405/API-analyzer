import re
from typing import Dict, Any, List, Tuple, Optional
from backend.models.schemas import BehavioralContract, BehavioralDifference, DeonticModality
from backend.nlp.embeddings import embedding_engine
from backend.config import SEMANTIC_DRIFT_THRESHOLD, SIMILARITY_STRICT_BREAKING_THRESHOLD

class BehavioralComparator:
    """
    Compares behavioral contracts, deontic modalities, and description semantics
    to detect behavioral drift, contract tightening, and undocumented shifts.
    """
    def __init__(self):
        self.embedding_engine = embedding_engine

    def compare_behaviors(
        self,
        v1_summary: str,
        v1_desc: str,
        v2_summary: str,
        v2_desc: str,
        v1_contract: BehavioralContract,
        v2_contract: BehavioralContract,
    ) -> Tuple[float, float, List[BehavioralDifference], bool]:
        """
        Returns:
            (semantic_similarity, semantic_drift, behavioral_differences, is_behaviorally_breaking)
        """
        v1_full = f"{v1_summary or ''}. {v1_desc or ''}".strip()
        v2_full = f"{v2_summary or ''}. {v2_desc or ''}".strip()

        # 1. Compute Semantic Similarity & Drift
        if not v1_full and not v2_full:
            similarity = 1.0
            drift = 0.0
        elif not v1_full or not v2_full:
            similarity = 0.0
            drift = 1.0
        else:
            try:
                similarity = self.embedding_engine.compute_similarity(v1_full, v2_full)
                drift = 1.0 - similarity
            except Exception as e:
                # Fallback to lexical Jaccard similarity if embedding model not ready
                v1_tokens = set(re.findall(r"\w+", v1_full.lower()))
                v2_tokens = set(re.findall(r"\w+", v2_full.lower()))
                union = v1_tokens.union(v2_tokens)
                similarity = len(v1_tokens.intersection(v2_tokens)) / len(union) if union else 1.0
                drift = 1.0 - similarity

        differences: List[BehavioralDifference] = []
        is_breaking = False

        # 2. Significant Semantic Meaning Shift
        if drift > SEMANTIC_DRIFT_THRESHOLD:
            is_critical = drift > (1.0 - SIMILARITY_STRICT_BREAKING_THRESHOLD)
            sev = "HIGH" if is_critical else "MEDIUM"
            breaking_flag = is_critical
            if breaking_flag:
                is_breaking = True
            differences.append(BehavioralDifference(
                category="semantic_drift",
                severity=sev,
                is_breaking=breaking_flag,
                v1_context=v1_full[:150] + ("..." if len(v1_full) > 150 else ""),
                v2_context=v2_full[:150] + ("..." if len(v2_full) > 150 else ""),
                explanation=(
                    f"Documented intent and behavioral explanation drifted significantly "
                    f"(Semantic similarity: {similarity:.2f}, Drift: {drift:.2f})."
                )
            ))

        # 3. Preconditions Tightened (Breaking) vs Loosened
        v1_pre = set(v1_contract.preconditions)
        v2_pre = set(v2_contract.preconditions)
        new_preconditions = v2_pre - v1_pre
        if new_preconditions:
            is_breaking = True
            for pre in new_preconditions:
                differences.append(BehavioralDifference(
                    category="precondition_tightened",
                    severity="HIGH",
                    is_breaking=True,
                    v2_context=pre,
                    explanation=f"New behavioral precondition or requirement imposed: '{pre}'."
                ))

        # 4. Postcondition / Side-Effect Alteration
        # Specifically check asynchronous shift or permanent deletion
        v1_post_text = " ".join(v1_contract.postconditions).lower()
        v2_post_text = " ".join(v2_contract.postconditions).lower()
        
        is_v1_async = any(w in v1_post_text for w in ["async", "queue", "background", "enqueu"])
        is_v2_async = any(w in v2_post_text for w in ["async", "queue", "background", "enqueu"])
        if not is_v1_async and is_v2_async:
            is_breaking = True
            differences.append(BehavioralDifference(
                category="postcondition_altered",
                severity="CRITICAL",
                is_breaking=True,
                v1_context="Synchronous execution",
                v2_context="Asynchronous background processing",
                explanation="Execution model shifted from synchronous response to asynchronous background queueing."
            ))

        # 5. Error Condition Changes
        v1_err = set(v1_contract.error_conditions)
        v2_err = set(v2_contract.error_conditions)
        new_errors = v2_err - v1_err
        if new_errors:
            for err in new_errors:
                differences.append(BehavioralDifference(
                    category="error_condition_changed",
                    severity="MEDIUM",
                    is_breaking=False, # New documented error could be protective
                    v2_context=err,
                    explanation=f"New documented failure/error condition: '{err}'."
                ))

        # 6. Rate Limit Reductions
        v1_rl = " ".join(v1_contract.rate_limits).lower()
        v2_rl = " ".join(v2_contract.rate_limits).lower()
        if v2_rl and not v1_rl:
            is_breaking = True
            differences.append(BehavioralDifference(
                category="rate_limit_imposed",
                severity="HIGH",
                is_breaking=True,
                v2_context=v2_rl,
                explanation=f"Explicit rate limit or throttling quota newly documented: '{v2_rl}'."
            ))
        elif v1_rl and v2_rl and v1_rl != v2_rl:
            # Check numbers
            nums1 = re.findall(r"\d+", v1_rl)
            nums2 = re.findall(r"\d+", v2_rl)
            if nums1 and nums2 and int(nums2[0]) < int(nums1[0]):
                is_breaking = True
                differences.append(BehavioralDifference(
                    category="rate_limit_reduced",
                    severity="HIGH",
                    is_breaking=True,
                    v1_context=v1_rl,
                    v2_context=v2_rl,
                    explanation=f"Throttling quota lowered from {nums1[0]} to {nums2[0]}."
                ))

        # 7. Deontic Modality Shifts (e.g. Permission -> Obligation)
        # Check if words that were optional became mandatory
        v1_perm = " ".join(v1_contract.modalities.permission).lower()
        v2_oblg = " ".join(v2_contract.modalities.obligation).lower()
        if v1_perm and v2_oblg:
            # Check overlap in key subject nouns
            tokens1 = set(re.findall(r"\b[a-zA-Z_]{4,}\b", v1_perm))
            tokens2 = set(re.findall(r"\b[a-zA-Z_]{4,}\b", v2_oblg))
            common = tokens1.intersection(tokens2) - {"optional", "required", "must", "caller", "field", "parameter"}
            if common:
                is_breaking = True
                differences.append(BehavioralDifference(
                    category="deontic_shift_to_obligation",
                    severity="HIGH",
                    is_breaking=True,
                    v1_context=v1_perm[:100],
                    v2_context=v2_oblg[:100],
                    explanation=f"Behavioral shift: previously optional contract element ({', '.join(common)}) is now mandatory."
                ))

        # 8. Deprecation Notices
        if not v1_contract.deprecation_notices and v2_contract.deprecation_notices:
            notice = " ".join(v2_contract.deprecation_notices)
            differences.append(BehavioralDifference(
                category="deprecation_added",
                severity="MEDIUM",
                is_breaking=False, # Deprecation precedes removal
                v2_context=notice,
                explanation=f"Endpoint or feature documented as deprecated: '{notice}'."
            ))

        return similarity, drift, differences, is_breaking
