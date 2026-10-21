import re
from typing import Dict, List, Any, Optional
from backend.models.schemas import BehavioralContract, DeonticModality

# Regex patterns for linguistic contract extraction
MODALITY_PATTERNS = {
    "obligation": [
        r"\b(?:must|shall|is required to|are required to|mandatory|strictly required|needs? to|has to|have to)\b",
        r"\b(?:requirement|prerequisite|must contain|must be)\b"
    ],
    "prohibition": [
        r"\b(?:must not|shall not|cannot|can not|is forbidden|are forbidden|prohibited|disallowed|not allowed|never)\b"
    ],
    "permission": [
        r"\b(?:may|can|optional|optionally|permitted|allowed to|might|is permitted)\b"
    ]
}

PRECONDITION_PATTERNS = [
    r"(?:caller|client|user|request)\s+(?:must|shall|needs to|has to)\s+[^.]+?(?:\.|$)",
    r"(?:requires|requiring)\s+(?:an?|the|valid|active|admin|bearer|api key|authentication|header)[^.]+?(?:\.|$)",
    r"(?:must be authenticated|requires authentication|admin access only|bearer token is required)[^.]*?(?:\.|$)",
    r"(?:only available (?:to|for)|restricted to)[^.]+?(?:\.|$)",
    r"(?:prior to calling|before invoking|precondition:?)[^.]+?(?:\.|$)",
    r"(?:header|parameter|field)\s+['\"`]?[\w-]+['\"`]?\s+is\s+(?:mandatory|required)[^.]*?(?:\.|$)",
    r"(?:input|value|payload)\s+must\s+(?:be|contain|match|not be)[^.]+?(?:\.|$)"
]

POSTCONDITION_PATTERNS = [
    r"(?:asynchronously|background task|enqueues|queues|scheduled)\s+[^.]+?(?:\.|$)",
    r"(?:permanently deletes|removes from database|cascade deletes?)[^.]+?(?:\.|$)",
    r"(?:triggers?|dispatches?|sends?)\s+(?:a webhook|an email|notification|event|message)[^.]+?(?:\.|$)",
    r"(?:invalidates|clears|refreshes)\s+(?:tokens?|cache|sessions?)[^.]+?(?:\.|$)",
    r"(?:creates|inserts|registers)\s+(?:a new|an?)\s+[^.]+?(?:\.|$)",
    r"(?:modifies|alters|updates)\s+(?:state|status|record|ledger)[^.]+?(?:\.|$)"
]

ERROR_CONDITION_PATTERNS = [
    r"(?:returns?|responds with|yields?)\s+(?:4\d{2}|5\d{2})\b[^.]+?(?:\.|$)",
    r"(?:throws?|raises?)\s+[^.]+?(?:error|exception|fault)[^.]*?(?:\.|$)",
    r"(?:if|when)\s+[^.]+?(?:fails?|is invalid|not found|unauthorized|forbidden|exceeds?)[^.]+?(?:\.|$)",
    r"(?:error condition:?|on failure:?)[^.]+?(?:\.|$)"
]

RATE_LIMIT_PATTERNS = [
    r"(?:rate limit(?:ed)?|quota|throttl(?:ed|ing)|requests? per (?:minute|second|hour|day)|req\/(?:min|sec|hr)|rpm|rps)[^.]+?(?:\.|$)",
    r"(?:maximum of \d+|\d+\s*calls|\d+\s*requests)[^.]+?(?:\.|$)"
]

DEPRECATION_PATTERNS = [
    r"(?:deprecated|obsolete|sunset|no longer supported|discontinued|will be removed)[^.]+?(?:\.|$)",
    r"(?:use\s+(?:endpoint\s+)?[\w\/\-]+\s+instead)[^.]+?(?:\.|$)",
    r"(?:migrat(?:e|ion)\s+to)[^.]+?(?:\.|$)"
]

CONSTRAINT_PATTERNS = [
    r"(?:minimum length|maximum length|min length|max length|min|max|between \d+ and \d+)[^.]+?(?:\.|$)",
    r"(?:regex|pattern|must match|must adhere to|format:?)[^.]+?(?:\.|$)",
    r"(?:positive integer|alphanumeric|uuid format|iso 8601)[^.]+?(?:\.|$)"
]

class LinguisticContractExtractor:
    """
    Extracts semantic behavioral contracts, deontic modalities, preconditions,
    postconditions, error rules, and constraints from API documentation texts.
    """
    def __init__(self):
        self.nlp = None
        self._init_spacy()

    def _init_spacy(self):
        try:
            import spacy
            try:
                self.nlp = spacy.load("en_core_web_sm")
            except Exception:
                # If en_core_web_sm model isn't downloaded, use blank or basic spacy English pipeline
                self.nlp = spacy.blank("en")
                if "sentencizer" not in self.nlp.pipe_names:
                    self.nlp.add_pipe("sentencizer")
        except Exception as e:
            self.nlp = None

    def split_sentences(self, text: str) -> List[str]:
        if not text or not text.strip():
            return []
        cleaned = re.sub(r"[\r\n]+", " ", text).strip()
        if self.nlp:
            try:
                doc = self.nlp(cleaned)
                return [sent.text.strip() for sent in doc.sents if sent.text.strip()]
            except Exception:
                pass
        # Fallback sentence splitting
        sentences = re.split(r"(?<=[.!?])\s+", cleaned)
        return [s.strip() for s in sentences if s.strip()]

    def extract_modalities(self, text: str) -> DeonticModality:
        modality = DeonticModality()
        if not text:
            return modality

        sentences = self.split_sentences(text)
        for sent in sentences:
            sent_lower = sent.lower()
            for pattern in MODALITY_PATTERNS["obligation"]:
                if re.search(pattern, sent_lower):
                    if sent not in modality.obligation:
                        modality.obligation.append(sent)
                    break
            
            for pattern in MODALITY_PATTERNS["prohibition"]:
                if re.search(pattern, sent_lower):
                    if sent not in modality.prohibition:
                        modality.prohibition.append(sent)
                    break

            for pattern in MODALITY_PATTERNS["permission"]:
                if re.search(pattern, sent_lower):
                    if sent not in modality.permission:
                        modality.permission.append(sent)
                    break

        return modality

    def _extract_by_patterns(self, text: str, patterns: List[str]) -> List[str]:
        results = []
        if not text:
            return results
        sentences = self.split_sentences(text)
        for sent in sentences:
            sent_lower = sent.lower()
            for pattern in patterns:
                if re.search(pattern, sent_lower):
                    if sent not in results:
                        results.append(sent)
                    break
        return results

    def extract_contracts(self, text: str, summary: Optional[str] = None) -> BehavioralContract:
        combined = f"{summary or ''}. {text or ''}".strip()
        modalities = self.extract_modalities(combined)
        
        preconditions = self._extract_by_patterns(combined, PRECONDITION_PATTERNS)
        postconditions = self._extract_by_patterns(combined, POSTCONDITION_PATTERNS)
        error_conditions = self._extract_by_patterns(combined, ERROR_CONDITION_PATTERNS)
        rate_limits = self._extract_by_patterns(combined, RATE_LIMIT_PATTERNS)
        deprecation_notices = self._extract_by_patterns(combined, DEPRECATION_PATTERNS)
        constraints = self._extract_by_patterns(combined, CONSTRAINT_PATTERNS)

        return BehavioralContract(
            preconditions=preconditions,
            postconditions=postconditions,
            error_conditions=error_conditions,
            rate_limits=rate_limits,
            deprecation_notices=deprecation_notices,
            constraints=constraints,
            modalities=modalities
        )
