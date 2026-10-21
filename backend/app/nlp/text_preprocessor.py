import re
from typing import List

class TextPreprocessor:
    """
    Normalizes and cleans documentation text for sentence embeddings and NLP analysis.
    """
    @staticmethod
    def clean(text: str) -> str:
        if not text:
            return ""
        # Strip markdown syntax headers, backticks, bold/italics
        cleaned = re.sub(r'#+\s*', '', text)
        cleaned = re.sub(r'[`*_~]', '', cleaned)
        # Collapse multiple whitespace, tabs, and newlines into single spaces
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        return cleaned

    @staticmethod
    def split_sentences(text: str) -> List[str]:
        cleaned = TextPreprocessor.clean(text)
        if not cleaned:
            return []
        # Split on standard sentence delimiters .!? followed by whitespace or uppercase
        sentences = re.split(r'(?<=[.!?])\s+', cleaned)
        return [s.strip() for s in sentences if s.strip()]
