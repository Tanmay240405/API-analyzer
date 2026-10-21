# Member Task Allocation & Module Independence Specification

This document provides the formal task breakdown, module ownership matrix, evaluation criteria, and independent demonstration workflows for the three team members.

---

## 👥 Executive Division of Responsibilities

```
+----------------------------------------------------------------------------------------------------+
|                                    SHARED SYSTEM INTEGRATION                                       |
|  - Common Pydantic Schemas (`schemas/change.py`, `schemas/analysis.py`, `schemas/specification.py`)  |
|  - FastAPI Root Application & Middleware (`app/main.py`, `core/config.py`)                         |
|  - SQLite Database Persistence (`repositories/analysis_repository.py`)                            |
|  - Multi-tab Unified Results Dashboard (`frontend/src/pages/AnalysisDetailPage.tsx`)               |
+----------------------------------------------------------------------------------------------------+
              │                                      │                                      │
              ▼                                      ▼                                      ▼
+───────────────────────────+          +───────────────────────────+          +───────────────────────────+
|         STUDENT 1         |          |         STUDENT 2         |          |         STUDENT 3         |
|  Structural Change Diff   |          |    Semantic NLP Drift     |          |   Behavioral & Migration  |
+───────────────────────────+          +───────────────────────────+          +───────────────────────────+
| - `structural_diff.py`    |          | - `semantic_analyzer.py`  |          | - `behavioral_analyzer.py`|
| - `specification_parser`  |          | - `text_preprocessor.py`  |          | - `impact_analyzer.py`    |
| - POST /analyses/struct   |          | - all-MiniLM-L6-v2 Embed  |          | - `migration_recommender` |
| - Structural Diff Page    |          | - POST /analyses/semantic |          | - POST /analyses/behavior |
| - AST Schema Comparison   |          | - POST /semantic-test     |          | - Behavioral Impact Page  |
| - `test_structural_diff`  |          | - Semantic Analysis Page  |          | - Multi-lang Code Gen     |
| - `test_parser.py`        |          | - `test_semantic_analyzer`|          | - `test_behavioral_diff`  |
+───────────────────────────+          +───────────────────────────+          +───────────────────────────+
```

---

## 👤 Student 1 — Structural Change Detection

### 1. Module Ownership
- **Core Engine:** `backend/app/nlp/structural_diff.py`
- **Parser & Normalization:** `backend/app/services/specification_parser.py`
- **Schemas:** `backend/app/schemas/specification.py` & structural records in `backend/app/schemas/change.py`
- **API Endpoint:** `POST /api/analyses/structural`
- **Frontend Page:** `frontend/src/pages/StructuralDiffPage.tsx`
- **Automated Tests:** `backend/app/tests/test_parser.py` & `backend/app/tests/test_structural_diff.py`

### 2. Deliverables
1. **OpenAPI 3.x & Swagger 2.0 Parser:** Robust parser supporting YAML and JSON with recursive local `$ref` resolution, parameter extraction, and request/response schema parsing.
2. **Deterministic Structural Diff Engine:**
   - Detects added and removed endpoints and HTTP methods.
   - Identifies parameter additions, removals, and data type changes.
   - Detects optional-to-required and required-to-optional parameter shifts.
   - Detects default value and enum constraint alterations.
   - Tracks response status code additions/removals and content-type updates.
   - Analyzes request body and response body schema field additions/removals.
3. **Structured Output:** Produces canonical `StructuralChangeRecord` items containing JSON component paths, old/new values, deterministic severities, and preliminary breaking classifications.

### 3. Independent Demonstration Workflow (Viva / Presentation)
1. **Frontend:** Navigate to **Structural Diff** (`http://127.0.0.1:5173/structural-diff`).
2. **Action:** Click **"Live Sandbox Demo"**. Paste an old OpenAPI YAML and new OpenAPI YAML (or use the preloaded template with `/products` and `/obsolete_feed`).
3. **Trigger:** Click **"Run Structural Diff"**.
4. **Validation:** Demonstrate that without running any NLP models, the system immediately returns:
   - Added endpoint: `POST /products/{id}/restock` (Non-breaking).
   - Removed endpoint: `GET /obsolete_feed` (Breaking).
   - Parameter `warehouse_id` changed optional &rarr; required (Breaking).
   - Default pagination limit changed `50` &rarr; `20` (Potentially breaking).
5. **Terminal / API:** Demonstrate via cURL or Pytest:
   ```bash
   python -m pytest backend/app/tests/test_parser.py backend/app/tests/test_structural_diff.py -v
   ```

### 4. Evaluation Criteria
- Correctness of AST component normalization and `$ref` resolution.
- Deterministic identification of all breaking structural schema shifts.
- 100% test pass rate across parser and structural test suites.

---

## 👤 Student 2 — Semantic NLP Analysis

### 1. Module Ownership
- **Core Engine:** `backend/app/nlp/semantic_analyzer.py`
- **Text Preprocessor:** `backend/app/nlp/text_preprocessor.py`
- **Model Integration:** `sentence-transformers/all-MiniLM-L6-v2` dense vector embeddings
- **API Endpoints:** `POST /api/analyses/semantic` & `POST /api/semantic-test`
- **Frontend Page:** `frontend/src/pages/SemanticAnalysisPage.tsx`
- **Automated Tests:** `backend/app/tests/test_semantic_analyzer.py`
- **Evaluation Dataset:** Semantic cases in `backend/data/evaluation_cases.json`

### 2. Deliverables
1. **Pretrained Sentence Transformer Integration:** Real 384-dimensional dense vector embeddings with L2 normalization and cosine similarity computation.
2. **Text Normalization Pipeline:** Strips markdown formatting, collapses whitespace, and standardizes sentence boundaries.
3. **Semantic Drift & Meaning Shift Detection:**
   - Configurable cosine similarity thresholds (`SIMILARITY_THRESHOLD_DRIFT = 0.75`).
   - Scope narrowing detection (e.g., *"all products"* &rarr; *"available products only"*).
   - Negation flipping (e.g., *"retries automatically"* &rarr; *"does not retry automatically"*).
   - Inclusion vs. Exclusion contradictions.
   - Ambiguity and human-review flags (`requires_review: True`).

### 3. Independent Demonstration Workflow (Viva / Presentation)
1. **Frontend:** Navigate to **Semantic Analysis** (`http://127.0.0.1:5173/semantic-analysis`).
2. **Action:** Under **Manual Text-Comparison Sandbox**, paste:
   - *Baseline (v1):* `"Returns all customer billing invoice records without restriction."`
   - *Updated (v2):* `"Returns available customer invoices only. Settled or archived records are excluded."`
3. **Trigger:** Click **"Evaluate Semantic Shift"**.
4. **Validation:** Demonstrate that despite schemas being structurally identical, the NLP model detects:
   - Cosine Similarity: `~72.1%` (Drift: `~27.9%`).
   - Breaking Contract Shift: Scope narrowing from universal set to conditional subset.
   - Review flag: `requires_review = true`.
5. **Cosmetic Proof:** Enter minor stylistic rewordings (*"Retrieves users"* &rarr; *"Retrieves a list of users"*) and show that cosine similarity remains `> 95%` and is classified as non-breaking.
6. **Terminal / API:**
   ```bash
   python -m pytest backend/app/tests/test_semantic_analyzer.py -v
   ```

### 4. Evaluation Criteria
- Accuracy and calibration of dense vector cosine similarity calculations.
- Discerning true meaning changes from harmless stylistic rewordings.
- Elimination of false positives and calibrated uncertainty indicators.

---

## 👤 Student 3 — Behavioral Impact and Migration Recommendations

### 1. Module Ownership
- **Behavioral Contract Engine:** `backend/app/nlp/behavioral_analyzer.py`
- **Impact Synthesis Engine:** `backend/app/nlp/impact_analyzer.py`
- **Migration Code Generator:** `backend/app/nlp/migration_recommender.py`
- **API Endpoint:** `POST /api/analyses/behavioral`
- **Frontend Page:** `frontend/src/pages/BehavioralImpactPage.tsx`
- **Automated Tests:** `backend/app/tests/test_behavioral_analyzer.py` & `backend/app/tests/test_impact_analyzer.py`

### 2. Deliverables
1. **Linguistic Deontic Modality Extraction:**
   - Extracts modal verbs using regex grammars and `spaCy`:
     - **Obligations:** *must*, *shall*, *required to*, *mandatory*.
     - **Prohibitions:** *must not*, *shall not*, *cannot*, *forbidden*.
     - **Permissions:** *may*, *can*, *optional*, *permitted*.
   - Identifies precondition tightening, rate limits, deprecations, and execution model transitions (synchronous immediate &rarr; asynchronous job queue).
2. **Transparent Impact Classification:**
   - Classifies changes as `BREAKING`, `NON_BREAKING`, `POTENTIALLY_BREAKING`, or `NEEDS_REVIEW`.
   - Computes severity levels (`Critical`, `High`, `Medium`, `Low`, `Informational`) and consumer impact narratives.
3. **Actionable Migration Recommendations & Code Generation:**
   - Grounded remediation instructions explaining why a change affects consumers.
   - Before vs. After code snippets in **cURL**, **Python (Requests)**, and **TypeScript (Axios)**.

### 3. Independent Demonstration Workflow (Viva / Presentation)
1. **Frontend:** Navigate to **Behavioral Impact** (`http://127.0.0.1:5173/behavioral-impact`).
2. **Action:** Click **"Live Sandbox Demo"**. Use the preloaded text:
   - *Baseline (v1):* *"Processes card payments synchronously. Caller may optionally provide idempotency key."*
   - *Target (v2):* *"Enqueues payment request into asynchronous worker queue. Mandatory requirement: caller must provide valid idempotency_key in request headers. Strictly rate limited to 50 req/min."*
3. **Trigger:** Click **"Extract Behavioral Shifts"**.
4. **Validation:** Demonstrate the extracted modal statements:
   - `[Obligation]`: *"Caller must provide valid idempotency_key in request headers."*
   - `[Execution Model]`: Synchronous settlement &rarr; Asynchronous worker queue.
   - `[Rate Limit]`: 50 req/min quota.
   - Multi-language migration code generated with asynchronous 202 polling logic in Python, TypeScript, and cURL.
5. **Terminal / API:**
   ```bash
   python -m pytest backend/app/tests/test_behavioral_analyzer.py backend/app/tests/test_impact_analyzer.py -v
   ```

### 4. Evaluation Criteria
- Correctness of deontic modality classification (Obligation, Prohibition, Permission).
- Traceability and transparency of impact classification reasoning.
- Syntactic validity and usefulness of generated before/after migration code snippets.

---

## 🔬 Multi-Student NLP Datasets & Model Training Pipelines

To fulfill rigorous academic criteria, the project incorporates **3 distinct domain datasets / corpora**, **3 distinct trained/fine-tuned NLP models**, and automated training pipelines.

### Summary Matrix

| Student | Assigned Task | Domain Corpus File | Model Architecture & Technique | Evaluation Metrics Achieved | Saved Artifact Path |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Student 1** | Structural AST & Schema Mutation Categorization | `backend/data/corpus/api_structural_corpus.json` (40 samples) | Character & Word TF-IDF + Neural `MLPClassifier` (64x32) | **90.0% Accuracy**, **89.3% F1-Score** | `backend/models/student1_structural/` |
| **Student 2** | Documentation Semantic Similarity & Drift Bi-Encoder | `backend/data/corpus/api_semantic_sts_corpus.json` (36 annotated pairs) | Fine-Tuned `sentence-transformers/all-MiniLM-L6-v2` with `CosineSimilarityLoss` + PyTorch AdamW | **MSE Loss: 0.0376** (improved from 0.0554), **Pearson: 0.368** | `backend/models/student2_semantic/` |
| **Student 3** | Behavioral Deontic Contract & Risk Severity Classifier | `backend/data/corpus/api_behavioral_corpus.json` (40 clauses) | Dual-Head Multi-Task Classifier (TF-IDF + MLP for Modality + Logistic Model for Breaking Severity) | **Deontic Accuracy: 100.0%**, **F1: 100.0%** | `backend/models/student3_behavioral/` |

### How to Run the Model Training & Fine-Tuning Pipelines

1. **Train all 3 student models sequentially:**
   ```bash
   python backend/training/train_all.py
   ```

2. **Train / Fine-Tune Individual Student Models:**
   - **Student 1:**
     ```bash
     python backend/training/train_student1_structural.py
     ```
   - **Student 2:**
     ```bash
     python backend/training/train_student2_semantic.py
     ```
   - **Student 3:**
     ```bash
     python backend/training/train_student3_behavioral.py
     ```

3. **API & UI Verification:**
   - Query endpoint: `GET http://127.0.0.1:8000/api/evaluation/student-models`
   - Open Web Dashboard: Navigate to **Evaluation** (`http://127.0.0.1:5173/evaluation`) to view the interactive **Multi-Student Trained NLP Models & Fine-Tuned Corpora** dashboard.

---

## 🤝 Shared Integration Responsibilities

All three team members coordinate on:
1. **Shared Pydantic Schemas:** Canonical `ChangeRecord`, `AnalysisResult`, and `EndpointChange` models defined in `backend/app/schemas/`.
2. **End-to-End Orchestrator:** `backend/app/services/analysis_orchestrator.py` which sequences Student 1, Student 2, and Student 3 modules into a unified comparison run.
3. **SQLite Database Persistence:** `backend/app/repositories/analysis_repository.py` preserving history, summaries, individual findings, and evaluation runs.
4. **Academic Benchmark Dataset:** `backend/data/evaluation_cases.json` and `backend/app/evaluation/benchmark.py` proving baseline vs. NLP improvements.
5. **Report Service:** `backend/app/services/report_service.py` exporting full analysis results to JSON, CSV, and printable HTML.
6. **Full Test Suite Verification:** Running the complete 20-test test suite:
   ```bash
   python -m pytest backend/app/tests/ -v
   ```
