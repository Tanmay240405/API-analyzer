import threading
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from backend.app.core.config import settings
from backend.app.core.logging import setup_logging, get_logger
from backend.app.core.exceptions import APIAnalysisException
from backend.app.repositories.analysis_repository import analysis_repository
from backend.app.services.analysis_orchestrator import orchestrator

from backend.app.api.routes import health, specifications, analyses, evaluation, exports

setup_logging()
logger = get_logger("main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database
    analysis_repository.init_db()
    # Preload SentenceTransformer model in a daemon thread so server starts immediately
    threading.Thread(target=orchestrator.semantic_analyzer.load_model, daemon=True).start()
    logger.info("Application lifespan initialized.")
    yield
    logger.info("Application shutdown.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="NLP-Based Semantic and Behavioral Impact Analysis of API Changes - Production Developer Platform & Academic Engine",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
@app.exception_handler(APIAnalysisException)
async def api_exception_handler(request: Request, exc: APIAnalysisException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.message, "details": exc.details}
    )

# Include Routers with /api prefix
app.include_router(health.router, prefix=settings.API_PREFIX)
app.include_router(specifications.router, prefix=settings.API_PREFIX)
app.include_router(analyses.router, prefix=settings.API_PREFIX)
app.include_router(evaluation.router, prefix=settings.API_PREFIX)
app.include_router(exports.router, prefix=settings.API_PREFIX)

@app.get("/")
def root_redirect():
    return {
        "title": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "health": "/api/health"
    }
