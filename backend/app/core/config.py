import os
from pathlib import Path
from typing import List
from pydantic import BaseModel

class Settings(BaseModel):
    # App
    PROJECT_NAME: str = "NLP-Based Semantic & Behavioral API Change Analyzer"
    VERSION: str = "2.1.0"
    API_PREFIX: str = "/api"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

    # Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = Path(__file__).resolve().parent.parent.parent / "data"
    DB_PATH: Path = Path(__file__).resolve().parent.parent.parent / "data" / "analysis_history.db"

    # Model configuration
    EMBEDDING_MODEL_NAME: str = os.getenv("EMBEDDING_MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2")
    SIMILARITY_THRESHOLD_HIGH: float = 0.88
    SIMILARITY_THRESHOLD_DRIFT: float = 0.75
    SIMILARITY_THRESHOLD_BREAKING: float = 0.60
    MAX_TEXT_LENGTH: int = 4096

    # Security & Uploads
    MAX_UPLOAD_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]

settings = Settings()

# Ensure data directory exists
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
