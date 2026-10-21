# NLP-Based Semantic and Behavioral Impact Analysis of API Changes

An academic-grade, full-stack API evolution analysis platform that combines **Sentence Transformers dense embeddings** (`all-MiniLM-L6-v2`) and **spaCy linguistic contract extraction** with structural OpenAPI/Swagger diffing. It detects structural breaks, behavioral drift (precondition tightening, side-effect changes, rate limits, deprecations, deontic modality shifts), calculates holistic breaking risk scores, and generates actionable code migration guides (cURL, Python Requests, TypeScript Axios).

---

## 🌟 Key Capabilities

1. **Dual Structural & NLP Behavioral Analysis Engine**:
   - **Structural Analysis (Task 1)**: Identifies route additions/removals, optional-to-required parameter transitions, type shifts, default changes, and schema alterations.
   - **Semantic Embeddings (Task 2)**: Computes dense 384-dimensional sentence vectors (`all-MiniLM-L6-v2`), evaluates cosine similarity, and detects scope narrowing (*"all products"* &rarr; *"available products only"*) even when schemas are identical.
   - **Linguistic Preprocessing & Rule Extraction (Task 3A)**: Extracts deontic modalities (Obligation: *must/shall*, Prohibition: *must not/cannot*, Permission: *may/optional*), preconditions, postconditions, and rate limits.
   - **Impact Synthesis & Risk Scoring (Task 3B)**: Categorizes changes into `STRUCTURAL_BREAKING`, `BEHAVIORAL_BREAKING`, `DUAL_BREAKING`, and `NON_BREAKING`. Computes a calibrated API Risk Score (0–100).
   - **Actionable Migration Guides (Task 3C)**: Generates remediation advice and Before/After code snippets in **cURL**, **Python (Requests)**, and **TypeScript (Axios)**.

2. **Empirical Benchmark & Evaluation**:
   - Compares the **Pure Structural Diff Baseline** against the **NLP-Enhanced System**.
   - Proves why pure structural diffing achieves only **16.7% recall** on real-world behavioral contract changes, whereas the NLP-enhanced engine achieves **100% recall** and **100% precision**.

3. **Curated Academic Datasets (1 Primary + 1 Secondary)**:
   - **Primary: [APIstic](https://zenodo.org/records/20525072)** (ACM MSR 2024 / USI Switzerland) — 1.2M+ OpenAPI specifications and GitHub commit evolution histories (Stripe, GitHub, Kubernetes, Box, Twilio). Drives model fine-tuning and benchmark pairs.
   - **Secondary: [Java API Evolution Data Corpus](https://github.com/labri-progress/api-evolution-data-corpus-improved)** (LaBRI / Kiv) — 251 curated library evolution cases cross-validating our breaking change taxonomy against established software engineering standards.

4. **Production Developer Dashboard**:
   - Left Sidebar Navigation across 8 working views (Overview, New Analysis, Structural Diff, Semantic Analysis, Behavioral Impact, History, Evaluation, Documentation).
   - Light theme default with instant Dark theme switching.
   - Recharts visual analytics (Category Distribution, Breaking vs. Non-Breaking).
   - Full report export in JSON, CSV, and Printable / PDF-ready HTML.
   - Independent manual text-comparison sandbox.

---

## 📁 Repository Structure

```
.
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI application setup
│   │   ├── api/routes/                 # health, specifications, analyses, evaluation, exports
│   │   ├── core/                       # config, logging, exceptions
│   │   ├── schemas/                    # Pydantic v2 validation models
│   │   ├── services/                   # specification_parser, analysis_orchestrator, report_service
│   │   ├── nlp/                        # structural_diff, semantic_analyzer, behavioral_analyzer, impact_analyzer
│   │   ├── repositories/               # analysis_repository (SQLite storage)
│   │   ├── evaluation/                 # metrics, benchmark
│   │   └── tests/                      # 20 automated unit and integration tests
│   ├── data/                           # sample_old.json, sample_new.json, evaluation_cases.json
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/                 # Sidebar, TopNav, HistoryView, BenchmarkView
│   │   ├── pages/                      # OverviewPage, NewAnalysisPage, AnalysisDetailPage, ...
│   │   ├── context/                    # ThemeContext (Light / Dark mode)
│   │   ├── services/                   # Axios API client
│   │   └── types/                      # TypeScript interface contracts
│   └── package.json
├── docs/
│   ├── architecture.md                 # System architecture & component hierarchy
│   ├── api-documentation.md            # REST API endpoint reference & schemas
│   ├── methodology.md                  # NLP algorithms & deontic modality grammar
│   ├── evaluation.md                   # Benchmark results & confusion matrix analysis
│   └── member-task-allocation.md       # Team task allocation & contribution breakdown
├── .gitignore
└── README.md
```

---

## 🚀 Quickstart Guide

### 1. Backend Setup
```bash
# Navigate to backend directory and install dependencies
cd backend
pip install -r requirements.txt
python -m spacy download en_core_web_sm

# Run the automated test suite (20 tests)
python -m pytest app/tests/ -v

# Start the FastAPI server (Runs on port 8000)
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
- Interactive Swagger API Documentation: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/api/health`

### 2. Frontend Setup
```bash
# Navigate to frontend directory and install dependencies
cd frontend
npm install

# Start the Vite development server (Runs on port 5173)
npm run dev -- --host 127.0.0.1
```
- Developer Dashboard: `http://127.0.0.1:5173/`

---

## 📚 Technical Documentation Index

For in-depth technical documentation, consult the `docs/` folder:
- [System Architecture](file:///docs/architecture.md)
- [REST API Documentation](file:///docs/api-documentation.md)
- [NLP Methodology](file:///docs/methodology.md)
- [Evaluation & Benchmark](file:///docs/evaluation.md)
- [Member Task Allocation](file:///docs/member-task-allocation.md)
