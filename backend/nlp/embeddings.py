import logging
import threading
from typing import List, Dict, Optional, Tuple, Any
import numpy as np

logger = logging.getLogger(__name__)

class SentenceEmbeddingEngine:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        if self._initialized:
            return
        self.model_name = model_name
        self._model = None
        self._load_error: Optional[str] = None
        self._is_loading = False
        self._cache: Dict[str, np.ndarray] = {}
        self._initialized = True

    @property
    def is_loaded(self) -> bool:
        return self._model is not None

    def get_status(self) -> Dict[str, Any]:
        return {
            "model_name": self.model_name,
            "is_loaded": self.is_loaded,
            "is_loading": self._is_loading,
            "load_error": self._load_error,
            "cache_size": len(self._cache),
            "backend": "SentenceTransformers (all-MiniLM-L6-v2)" if self.is_loaded else "Unloaded"
        }

    def load_model(self) -> bool:
        """
        Lazily loads the SentenceTransformer model in a thread-safe manner.
        """
        if self._model is not None:
            return True
        with self._lock:
            if self._model is not None:
                return True
            self._is_loading = True
            try:
                from sentence_transformers import SentenceTransformer
                logger.info(f"Loading SentenceTransformer model: {self.model_name}...")
                self._model = SentenceTransformer(self.model_name)
                self._load_error = None
                self._is_loading = False
                logger.info(f"SentenceTransformer {self.model_name} loaded successfully.")
                return True
            except Exception as e:
                self._is_loading = False
                self._load_error = str(e)
                logger.error(f"Failed to load SentenceTransformer model {self.model_name}: {e}")
                return False

    def encode(self, text: str) -> np.ndarray:
        """
        Generates and caches dense embedding for a given text.
        """
        normalized_text = (text or "").strip()
        if not normalized_text:
            # Return zero vector if empty
            return np.zeros(384, dtype=np.float32)

        if normalized_text in self._cache:
            return self._cache[normalized_text]

        if not self.is_loaded:
            success = self.load_model()
            if not success:
                raise RuntimeError(
                    f"SentenceTransformer model '{self.model_name}' could not be loaded: {self._load_error}. "
                    "Cannot perform semantic similarity without real model."
                )

        embedding = self._model.encode(normalized_text, convert_to_numpy=True, normalize_embeddings=True)
        self._cache[normalized_text] = embedding
        return embedding

    def compute_similarity(self, text1: str, text2: str) -> float:
        """
        Calculates cosine similarity between two sentences.
        Returns a float between 0.0 and 1.0.
        """
        t1 = (text1 or "").strip()
        t2 = (text2 or "").strip()
        
        # Exact match
        if t1.lower() == t2.lower():
            return 1.0
        if not t1 or not t2:
            return 0.0

        v1 = self.encode(t1)
        v2 = self.encode(t2)

        norm1 = np.linalg.norm(v1)
        norm2 = np.linalg.norm(v2)
        if norm1 == 0 or norm2 == 0:
            return 0.0

        similarity = float(np.dot(v1, v2) / (norm1 * norm2))
        return float(np.clip(similarity, 0.0, 1.0))

    def compute_semantic_drift(self, text1: str, text2: str) -> float:
        """
        Semantic drift = 1 - Cosine Similarity.
        Higher drift means larger shift in meaning.
        """
        sim = self.compute_similarity(text1, text2)
        return float(np.clip(1.0 - sim, 0.0, 1.0))

embedding_engine = SentenceEmbeddingEngine()
