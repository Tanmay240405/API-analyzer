from fastapi import APIRouter
from backend.app.services.analysis_orchestrator import orchestrator

router = APIRouter(tags=["Health"])

@router.get("/health")
def health_check():
    is_model_loaded = orchestrator.semantic_analyzer.is_loaded
    return {
        "status": "healthy",
        "service_status": "operational",
        "model_status": "ready" if is_model_loaded else "loading_or_fallback",
        "embedding_model": {
            "model_name": orchestrator.semantic_analyzer.model_name,
            "is_loaded": is_model_loaded,
            "backend": "SentenceTransformers (all-MiniLM-L6-v2)" if is_model_loaded else "Lexical Fallback"
        },
        "spacy_available": orchestrator.behavioral_analyzer._nlp is not None,
        "database": "SQLite operational"
    }
