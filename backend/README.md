# NLP-Based Semantic & Behavioral API Change Analyzer (Backend)

Academic full-stack engine for detecting structural schema changes, natural language semantic drift, and behavioral contract alterations in OpenAPI 3.x and Swagger 2.0 specifications.

## Architecture

```
backend/
    app/
        main.py                  # FastAPI assembly, CORS, lifespan, routes
        api/
            routes/
                health.py        # /api/health endpoint
                specifications.py# /api/specifications/validate, /api/samples
                analyses.py      # /api/analyses/full, /api/analyses/structural, /api/history
                evaluation.py    # /api/evaluation/run, /api/evaluation/results
                exports.py       # /api/analyses/{id}/export?format=json|csv|html
        core/
            config.py            # Pydantic BaseSettings & similarity thresholds
            logging.py           # Structured logging
            exceptions.py        # Custom APIAnalysisException hierarchy
        schemas/
            specification.py     # OpenAPI parsed endpoints & parameter schemas
            change.py            # StructuralChangeRecord, SemanticFinding, BehavioralFinding
            analysis.py          # ComparisonRequest, AnalysisResult, DashboardStats
            evaluation.py        # EvaluationCase, EvaluationMetrics, ConfusionMatrix
        services/
            specification_parser.py    # OpenAPI 3.x / Swagger 2.0 parser & $ref resolver
            analysis_orchestrator.py   # Multi-stage comparison pipeline executor
            report_service.py          # JSON, CSV, and Printable HTML export generator
        nlp/
            structural_diff.py         # Deterministic structural change detector (Task 1)
            semantic_analyzer.py       # SentenceTransformers embedding engine & drift (Task 2)
            behavioral_analyzer.py     # spaCy & deontic contract extraction (Task 3A)
            impact_analyzer.py         # BREAKING / POTENTIALLY_BREAKING classifier (Task 3B)
            migration_recommender.py   # Grounded migration advice & code snippets (Task 3C)
            text_preprocessor.py       # Normalization and sentence segmentation
        repositories/
            analysis_repository.py     # SQLite persistence & query operations
        evaluation/
            metrics.py                 # Precision, Recall, F1, Accuracy, Confusion Matrix
            benchmark.py               # Labeled benchmark evaluator (Baseline vs NLP)
        tests/
            test_parser.py
            test_structural_diff.py
            test_semantic_analyzer.py
            test_behavioral_analyzer.py
            test_impact_analyzer.py
            test_api.py
    data/
        sample_old.json
        sample_new.json
        evaluation_cases.json
    requirements.txt
    .env.example
    README.md
```

## Running the Backend

```bash
# 1. Install dependencies
pip install -r requirements.txt
python -m spacy download en_core_web_sm

# 2. Run test suite
pytest backend/app/tests/ -v

# 3. Start development server
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
