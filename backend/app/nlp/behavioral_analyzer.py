import re
import uuid
from typing import List, Dict, Optional, Tuple, Any
from backend.app.schemas.specification import ParsedSpecification, EndpointDefinition
from backend.app.schemas.change import (
    BehavioralFinding,
    BehavioralContract,
    DeonticModalities,
    ChangeSeverity,
    ChangeClassification
)
from backend.app.nlp.text_preprocessor import TextPreprocessor

class BehavioralAnalyzer:
    """
    Extracts and compares behavioral contracts from documentation text and explicit schemas.
    Differentiates observed spec differences from inferred NLP findings.
    """

    def __init__(self):
        self._nlp = None
        self._load_spacy()

    def _load_spacy(self):
        try:
            import spacy
            self._nlp = spacy.load("en_core_web_sm")
        except Exception:
            self._nlp = None

    def extract_contracts(self, text: str) -> BehavioralContract:
        cleaned = TextPreprocessor.clean(text)
        if not cleaned:
            return BehavioralContract()

        sentences = TextPreprocessor.split_sentences(cleaned)
        modalities = DeonticModalities()
        preconditions: List[str] = []
        postconditions: List[str] = []
        rate_limits: List[str] = []
        deprecations: List[str] = []

        obligation_pattern = re.compile(r'\b(must|shall|required to|mandatory|obligated to)\b', re.I)
        prohibition_pattern = re.compile(r'\b(must not|shall not|cannot|forbidden|prohibited|never)\b', re.I)
        permission_pattern = re.compile(r'\b(may|can|optional|permitted|allowed to)\b', re.I)

        precondition_pattern = re.compile(r'\b(prior to|before calling|prerequisite|must first|caller must provide|requires)\b', re.I)
        postcondition_pattern = re.compile(r'\b(asynchronously|queued|enqueued|background worker|purged|deleted immediately|persisted)\b', re.I)
        rate_limit_pattern = re.compile(r'\b(rate limit|requests per|req/min|quota|throttled|429)\b', re.I)
        deprecation_pattern = re.compile(r'\b(deprecated|will be removed|sunset|obsolete)\b', re.I)

        for sent in sentences:
            s_clean = sent.strip()
            # Deontic logic extraction (check prohibition before obligation so "must not" matches prohibition)
            if prohibition_pattern.search(s_clean):
                modalities.prohibition.append(s_clean)
            elif obligation_pattern.search(s_clean):
                modalities.obligation.append(s_clean)
            elif permission_pattern.search(s_clean):
                modalities.permission.append(s_clean)

            # Contract rules
            if precondition_pattern.search(s_clean):
                preconditions.append(s_clean)
            if postcondition_pattern.search(s_clean):
                postconditions.append(s_clean)
            if rate_limit_pattern.search(s_clean):
                rate_limits.append(s_clean)
            if deprecation_pattern.search(s_clean):
                deprecations.append(s_clean)

        return BehavioralContract(
            modalities=modalities,
            preconditions=preconditions,
            postconditions=postconditions,
            rate_limits=rate_limits,
            deprecations=deprecations
        )

    def compare_contracts(
        self,
        endpoint_path: str,
        http_method: str,
        c1: BehavioralContract,
        c2: BehavioralContract
    ) -> List[BehavioralFinding]:
        findings: List[BehavioralFinding] = []

        # 1. New Obligations (Permitted / absent -> Mandatory)
        new_obligations = set(c2.modalities.obligation) - set(c1.modalities.obligation)
        for ob in new_obligations:
            findings.append(
                BehavioralFinding(
                    id=f"beh-{uuid.uuid4().hex[:8]}",
                    endpoint_path=endpoint_path,
                    http_method=http_method,
                    category="deontic_obligation_tightened",
                    severity=ChangeSeverity.HIGH,
                    classification=ChangeClassification.BREAKING,
                    observed_in_spec=False,
                    evidence=ob,
                    explanation=f"New documented obligation imposed on client: '{ob}'.",
                    requires_review=True
                )
            )

        # 2. New Prohibitions
        new_prohibitions = set(c2.modalities.prohibition) - set(c1.modalities.prohibition)
        for pr in new_prohibitions:
            findings.append(
                BehavioralFinding(
                    id=f"beh-{uuid.uuid4().hex[:8]}",
                    endpoint_path=endpoint_path,
                    http_method=http_method,
                    category="deontic_prohibition_imposed",
                    severity=ChangeSeverity.HIGH,
                    classification=ChangeClassification.BREAKING,
                    observed_in_spec=False,
                    evidence=pr,
                    explanation=f"New documented prohibition introduced: '{pr}'.",
                    requires_review=True
                )
            )

        # 3. Precondition Tightened
        new_preconditions = set(c2.preconditions) - set(c1.preconditions)
        for pc in new_preconditions:
            findings.append(
                BehavioralFinding(
                    id=f"beh-{uuid.uuid4().hex[:8]}",
                    endpoint_path=endpoint_path,
                    http_method=http_method,
                    category="precondition_tightened",
                    severity=ChangeSeverity.HIGH,
                    classification=ChangeClassification.BREAKING,
                    observed_in_spec=False,
                    evidence=pc,
                    explanation=f"New behavioral precondition or requirement imposed: '{pc}'.",
                    requires_review=True
                )
            )

        # 4. Asynchronous / Postcondition Altered
        new_post = set(c2.postconditions) - set(c1.postconditions)
        for post in new_post:
            findings.append(
                BehavioralFinding(
                    id=f"beh-{uuid.uuid4().hex[:8]}",
                    endpoint_path=endpoint_path,
                    http_method=http_method,
                    category="execution_model_changed",
                    severity=ChangeSeverity.HIGH,
                    classification=ChangeClassification.BREAKING,
                    observed_in_spec=False,
                    evidence=post,
                    explanation=f"Execution model or postcondition altered: '{post}'.",
                    requires_review=True
                )
            )

        # 5. Rate Limits Imposed
        new_rates = set(c2.rate_limits) - set(c1.rate_limits)
        for rl in new_rates:
            findings.append(
                BehavioralFinding(
                    id=f"beh-{uuid.uuid4().hex[:8]}",
                    endpoint_path=endpoint_path,
                    http_method=http_method,
                    category="rate_limit_imposed",
                    severity=ChangeSeverity.MEDIUM,
                    classification=ChangeClassification.POTENTIALLY_BREAKING,
                    observed_in_spec=False,
                    evidence=rl,
                    explanation=f"Explicit rate limit or throttling quota newly documented: '{rl}'.",
                    requires_review=False
                )
            )

        # 6. Deprecations
        new_deps = set(c2.deprecations) - set(c1.deprecations)
        for dp in new_deps:
            findings.append(
                BehavioralFinding(
                    id=f"beh-{uuid.uuid4().hex[:8]}",
                    endpoint_path=endpoint_path,
                    http_method=http_method,
                    category="deprecation_notice",
                    severity=ChangeSeverity.MEDIUM,
                    classification=ChangeClassification.POTENTIALLY_BREAKING,
                    observed_in_spec=False,
                    evidence=dp,
                    explanation=f"Endpoint or feature documented as deprecated: '{dp}'.",
                    requires_review=False
                )
            )

        return findings

    def compare_endpoint_behavior(
        self,
        ep1: EndpointDefinition,
        ep2: EndpointDefinition
    ) -> Tuple[BehavioralContract, BehavioralContract, List[BehavioralFinding]]:
        text1 = f"{ep1.summary or ''} {ep1.description or ''}"
        text2 = f"{ep2.summary or ''} {ep2.description or ''}"

        contract1 = self.extract_contracts(text1)
        contract2 = self.extract_contracts(text2)

        findings = self.compare_contracts(ep1.path, ep1.method, contract1, contract2)

        # Explicit specification differences (Observed in spec)
        if not ep1.deprecated and ep2.deprecated:
            findings.append(
                BehavioralFinding(
                    id=f"beh-{uuid.uuid4().hex[:8]}",
                    endpoint_path=ep1.path,
                    http_method=ep1.method,
                    category="spec_deprecated_flag",
                    severity=ChangeSeverity.MEDIUM,
                    classification=ChangeClassification.POTENTIALLY_BREAKING,
                    observed_in_spec=True,
                    evidence="deprecated: true",
                    explanation=f"Operation '{ep1.method} {ep1.path}' marked deprecated in specification.",
                    requires_review=False
                )
            )

        return contract1, contract2, findings
