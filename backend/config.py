from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

SQLITE_DB_PATH = DATA_DIR / "analysis_history.db"

# NLP Model Configuration
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2")
SPACY_MODEL_NAME = os.getenv("SPACY_MODEL_NAME", "en_core_web_sm")

# Thresholds for Semantic Drift and Breaking Change Detection
SEMANTIC_DRIFT_THRESHOLD = float(os.getenv("SEMANTIC_DRIFT_THRESHOLD", "0.25")) # 1 - similarity > 0.25 is drift
SIMILARITY_STRICT_BREAKING_THRESHOLD = float(os.getenv("SIMILARITY_STRICT_BREAKING_THRESHOLD", "0.60")) # similarity < 0.60 indicates radical contract alteration
CONTRADICTION_THRESHOLD = float(os.getenv("CONTRADICTION_THRESHOLD", "0.55"))

# CORS settings
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
