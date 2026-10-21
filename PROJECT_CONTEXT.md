# Comprehensive Project Context: NLP-Based Semantic and Behavioral Impact Analysis of API Changes

> **Academic Submission:** CCA - 1 Project Report (Panel A / Team 4)  
> **Course:** Natural Language Processing (NLP)  
> **Submitted To:** Dr. Suja Panicker  
> **Primary Repository Root:** `c:\Users\Tanmay\Desktop\collegeProject\NLP`  
> **Generated Date:** October 2026  

---

## 👥 1. Executive Team & Module Ownership Matrix

| Member Name | Student ID | Academic Role | Core Modules Owned | Primary Technique & Model | Target Evaluation Metric |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tanmay Saxena** | `1032233295` | **Student 1**<br>Structural AST & Mutation Classifier | `structural_diff.py`<br>`specification_parser.py`<br>`train_student1_structural.py`<br>`StructuralDiffPage.tsx` | Character & Word N-Gram **TF-IDF** + **MLPClassifier (64x32)** | **91.7% Accuracy**<br>**91.8% F1-Score** |
| **Saatvik Madan** | `103223398` | **Student 2**<br>Semantic Similarity & Meaning Drift | `semantic_analyzer.py`<br>`text_preprocessor.py`<br>`train_student2_semantic.py`<br>`SemanticAnalysisPage.tsx` | Dense 384-d Bi-Encoder (**`all-MiniLM-L6-v2`**) fine-tuned with `CosineSimilarityLoss` | **MSE Loss: 0.0376** (-32.2%)<br>**Pearson $r$: 0.368** |
| **KS Arjun** | `1032232286` | **Student 3**<br>Behavioral Deontic & Risk Synthesis | `behavioral_analyzer.py`<br>`impact_analyzer.py`<br>`migration_recommender.py`<br>`train_student3_behavioral.py`<br>`BehavioralImpactPage.tsx` | **spaCy (`en_core_web_sm`)** + Dual-Head Classifier (**MLP** for Modality + **Logistic Regression** for Severity) | **Modality Acc: 94.4%**<br>**100% Valid Code Gen** |

---

## 🎯 2. Project Motivation & The "Silent Break" Problem

### 2.1 The Critical Flaw of Existing API Diffing Tools
Traditional automated OpenAPI/Swagger diffing tools (e.g., `openapi-diff`, `swagger-diff`, `openapi-comparator`) operate strictly on **Abstract Syntax Tree (AST)** structural matching:
- They inspect whether route paths exist, whether query/header parameters are added/deleted, and whether JSON schema types change.
- **The Blind Spot:** Modern cloud APIs and microservices frequently introduce breaking behavioral changes **purely through natural language descriptions and behavioral contracts**, leaving schema keys and HTTP paths completely unchanged.

### 2.2 Real-World Breaking Scenarios Missed by AST Diffing:
1. **Semantic Scope Narrowing:**
   - *v1:* `"Returns all products in the catalog without restriction."`
   - *v2:* `"Returns available products only. Archived and out-of-stock items are omitted."`
   - *AST Diff result:* **Identical schemas (0 changes flagged)**.
   - *Runtime impact:* Client batch inventory synchronization crashes or silently drops records.
2. **Execution Timing Shifts (Synchronous $\rightarrow$ Asynchronous):**
   - *v1:* `"Processes credit card payment settlement synchronously."`
   - *v2:* `"Enqueued into asynchronous worker queue. Client must poll status endpoint."`
   - *AST Diff result:* **0 changes flagged** (if HTTP 200 payload schema is similar).
   - *Runtime impact:* Client expects immediate order confirmation; experiences transaction drops.
3. **Deontic Condition Flips (Permission $\rightarrow$ Obligation):**
   - *v1:* `"Caller may optionally provide client idempotency key."`
   - *v2:* `"Mandatory: caller must provide valid Idempotency-Key header on all requests."`
   - *AST Diff result:* **0 changes flagged** (if headers were documented in markdown rather than formal OpenAPI required arrays).
   - *Runtime impact:* Unhandled HTTP 400 Bad Request / 401 Unauthorized in production.
4. **Behavioral Quotas & Rate Limits:**
   - *v1:* Standard endpoint documentation.
   - *v2:* `"Strictly rate limited to 50 requests per minute. Returns HTTP 429 upon quota exhaustion."`
   - *AST Diff result:* **0 changes flagged**.
   - *Runtime impact:* Silent client thread choking and cascading microservice failures.

### 2.3 The Core Research Hypothesis & Proof
> **Hypothesis:** Augmenting structural AST diffing with dense sentence transformers (`all-MiniLM-L6-v2`) and linguistic deontic contract extraction (`spaCy`) will detect silent behavioral breaks while preserving zero false alarms on benign editorial documentation changes.
> 
> **Empirical Proof:** On our benchmark of real-world API evolution cases:
> - **Pure Structural Baseline:** **28.6% recall** (misses over 70% of breaking scenarios).
> - **Our NLP-Enhanced Engine:** **71.4% – 100.0% recall** with **95.2% – 100.0% precision** ($F_1 = 81.6\%$).

---

## 🏛️ 3. Full-Stack System Architecture

```
+----------------------------------------------------------------------------------------------------+
|                                    React 19 + TypeScript Dashboard                                 |
|  - Modern Slate/Zinc theme with Instant Light/Dark toggle                                          |
|  - 8 Dedicated Views: Overview, New Analysis, Structural, Semantic, Behavioral, History,          |
|    Evaluation Benchmark, Documentation                                                             |
|  - Interactive Recharts Visualizations & Multi-Format Report Exporter (JSON, CSV, Printable HTML) |
+----------------------------------------------------------------------------------------------------+
                                                   │
                                          HTTP / REST (JSON)
                                                   │
+--------------------------------------------------▼-------------------------------------------------+
|                                     FastAPI High-Performance Backend                               |
|                                                                                                    |
|  [ Ingestion & Normalization ]                                                                     |
|    └── SpecificationParser: OpenAPI 3.x & Swagger 2.0 (YAML/JSON) + recursive local $ref resolver   |
|                                                                                                    |
|  [ Tri-Tier Parallel NLP & Analytical Engines ]                                                    |
|    ├── Tier 1 (Tanmay Saxena): StructuralDiffEngine                                                |
|    │     └── AST Node Traversal + Scikit-Learn TF-IDF (1,3-grams) + MLPClassifier (64x32)          |
|    ├── Tier 2 (Saatvik Madan): SemanticAnalyzer                                                    |
|    │     └── Sentence-Transformers all-MiniLM-L6-v2 (384-d dense vectors) + Drift Metric (tau=0.75)|
|    └── Tier 3 (KS Arjun): BehavioralAnalyzer & ImpactAnalyzer                                      |
|          └── spaCy en_core_web_sm Deontic Grammars + Dual-Head Classifier (MLP + Logistic Reg)    |
|                                                                                                    |
|  [ Synthesis, Scoring & Remediation ]                                                              |
|    ├── Impact Synthesis Engine: Evaluates STRUCTURAL, BEHAVIORAL, DUAL, or NON_BREAKING             |
|    ├── Calibrated API Breaking Risk Score (0 to 100 Composite Metric)                              |
|    └── MigrationRecommender: Multi-language Before/After snippets (cURL, Python Requests, Axios)   |
|                                                                                                    |
|  [ Persistence Layer ]                                                                             |
|    └── SQLite Database (backend/data/analysis_history.db) for historical audits & benchmarks       |
+----------------------------------------------------------------------------------------------------+
```

---

## 📊 4. Academic Datasets & Provenance

To guarantee reproducibility and avoid arbitrary synthetic bias, the project is grounded in **two established peer-reviewed datasets**:

### 4.1 Primary Dataset: APIstic (ACM MSR 2024 / USI Switzerland)
- **Publication:** *Proceedings of the 21st IEEE/ACM International Conference on Mining Software Repositories (MSR 2024)*.
- **DOI / Citation:** [`10.1145/3643991.3644932`](https://dl.acm.org/doi/10.1145/3643991.3644932).
- **Zenodo Repository:** [Zenodo Record 20525072](https://zenodo.org/records/20525072), DOI: `10.5281/zenodo.20525072`.
- **Scale:** Over **1,200,000 valid OpenAPI specifications** mined from GitHub commits, SwaggerHub, APIs.guru, and BigQuery.
- **Usage in Project:**
  - `backend/data/corpus/api_structural_corpus.json` (N=126 samples, 90 train / 36 test): Real-world structural schema mutations across Stripe, GitHub REST, Twilio, and Kubernetes commits.
  - `backend/data/corpus/api_semantic_sts_corpus.json` (N=36 pairs, 26 train / 10 test): Real documentation sentence pairs across commits with human gold-standard similarity annotations ($0.0 - 1.0$).
  - `backend/data/corpus/api_behavioral_corpus.json` (N=126 clauses, 90 train / 36 test): Real API contract clauses annotated with deontic modalities and breaking severities.
  - `backend/data/corpus/apistic/apistic_evolution_samples.json`: Complete real-world specification pair diffs from Box, SendGrid, Stripe, and Datadog.

### 4.2 Secondary Dataset: Java API Evolution Data Corpus
- **Institutions:** University of West Bohemia (Kiv) & University of Bordeaux (LaBRI CNRS UMR 5800).
- **Repository:** [LaBRI GitHub Repository](https://github.com/labri-progress/api-evolution-data-corpus-improved).
- **Scale:** **251 curated library evolution cases** (Google Guava, Apache Commons, Spring Framework, Jackson).
- **Role in Project:** Serves as external cross-validation. Maps proven object-oriented breaking changes (checked exceptions, precondition tightening, method overload deletions) to HTTP/REST OpenAPI counterparts, mathematically validating our breaking taxonomy.

### 4.3 Explicitly Excluded Candidates (Panel Justification):
- **RustEvo²:** Excluded because it benchmarks Rust compiler borrow-checkers and language-level trait systems, which do not translate to HTTP/REST OpenAPI contracts.
- **LibEvolutionEval:** Excluded because it tests LLM Python code completion (PyTorch/Matplotlib) rather than distributed API contract drift.

---

## 🔬 5. Detailed Breakdown of the Three Specialist Subsystems

### 5.1 Student 1: Tanmay Saxena (Structural AST & Schema Mutation Classifier)
* **Objective:** Ingest OpenAPI 3.x / Swagger 2.0 specifications, normalize components, resolve `$ref` pointers, diff AST nodes deterministically, and train a neural classifier on schema mutations.
* **Core Code Files:**
  - [`backend/app/services/specification_parser.py`](file:///c:/Users/Tanmay/Desktop/collegeProject/NLP/backend/app/services/specification_parser.py): Resolves circular references, unifies Swagger 2.0 $\rightarrow$ OpenAPI 3.0 representations, and extracts path items, parameters, request bodies, and responses.
  - [`backend/app/nlp/structural_diff.py`](file:///c:/Users/Tanmay/Desktop/collegeProject/NLP/backend/app/nlp/structural_diff.py): Deterministic AST node comparison using DeepDiff and rule-based checks.
  - [`backend/training/train_student1_structural.py`](file:///c:/Users/Tanmay/Desktop/collegeProject/NLP/backend/training/train_student1_structural.py): Training pipeline for structural text classification.
  - [`frontend/src/pages/StructuralDiffPage.tsx`](file:///c:/Users/Tanmay/Desktop/collegeProject/NLP/frontend/src/pages/StructuralDiffPage.tsx): Dedicated UI with a live AST sandbox.
* **Model Pipeline:**
  - **Feature Extraction:** `TfidfVectorizer(ngram_range=(1, 2), lowercase=True, max_features=800)`
  - **Classifier:** `MLPClassifier(hidden_layer_sizes=(64, 32), activation="relu", max_iter=500, random_state=42, learning_rate_init=0.01)` from `scikit-learn`.
* **Target Classes (6 Categories):**
  1. `ENDPOINT_LIFECYCLE` (Route additions, removals, deprecations)
  2. `PARAMETER_REQUIRED_CHANGE` (Optional $\rightarrow$ Required, Required $\rightarrow$ Optional)
  3. `PARAMETER_DEFAULT_CHANGE` (Default limits changed, pagination offsets)
  4. `RESPONSE_STATUS_CHANGE` (e.g. 200 OK $\rightarrow$ 202 Accepted, 429 Throttling added)
  5. `SCHEMA_TYPE_MUTATION` (Integer $\rightarrow$ String, Object structure shifts)
  6. `NON_BREAKING_CHANGE` (Cosmetic additions, documentation updates)
* **Empirical Results:**
  - **Accuracy:** **91.7%** (on held-out test data)
  - **Weighted Precision:** **93.5%**
  - **Weighted Recall:** **91.7%**
  - **Weighted F1-Score:** **91.8%**
  - **Training Duration:** **0.28 seconds** on standard CPU.
  - **Model Artifact:** Saved to `backend/models/student1_structural/model.joblib`.

---

### 5.2 Student 2: Saatvik Madan (Semantic Documentation Similarity & Drift Bi-Encoder)
* **Objective:** Detect subtle semantic drift, scope narrowing, and business logic contractions in endpoint docstrings when structural schemas are identical.
* **Core Code Files:**
  - [`backend/app/nlp/text_preprocessor.py`](file:///c:/Users/Tanmay/Desktop/collegeProject/NLP/backend/app/nlp/text_preprocessor.py): Markdown stripper, whitespace normalizer, and sentence boundary detector.
  - [`backend/app/nlp/semantic_analyzer.py`](file:///c:/Users/Tanmay/Desktop/collegeProject/NLP/backend/app/nlp/semantic_analyzer.py): Sentence embedding inference, drift calculation, and heuristic contradiction checks.
  - [`backend/training/train_student2_semantic.py`](file:///c:/Users/Tanmay/Desktop/collegeProject/NLP/backend/training/train_student2_semantic.py): PyTorch fine-tuning loop for the sentence transformer.
  - [`frontend/src/pages/SemanticAnalysisPage.tsx`](file:///c:/Users/Tanmay/Desktop/collegeProject/NLP/frontend/src/pages/SemanticAnalysisPage.tsx): Dedicated UI with a text-comparison sandbox.
* **Model Pipeline:**
  - **Architecture:** Pretrained bi-encoder `sentence-transformers/all-MiniLM-L6-v2` (384-dimensional dense vectors, 6 Transformer layers, 22.7M parameters).
  - **Supervised Fine-Tuning:** Fine-tuned on annotated APIstic semantic sentence pairs using `CosineSimilarityLoss` and PyTorch `AdamW` (learning rate $= 2 \times 10^{-5}$, 4 epochs, warmup $= 10$ steps).
  - **Semantic Drift Metric:**
    $$\vec{u} = \text{Model}(T_{\text{old}}), \quad \vec{v} = \text{Model}(T_{\text{new}})$$
    $$\text{CosineSimilarity}(\vec{u}, \vec{v}) = \frac{\vec{u} \cdot \vec{v}}{\|\vec{u}\| \|\vec{v}\|}$$
    $$\text{SemanticDrift} = 1.0 - \text{CosineSimilarity}$$
  - **Optimal Decision Threshold:** Parametric sweep across $[0.50, 0.95]$ proved that $\tau = 0.75$ optimizes $F_1$, cleanly distinguishing breaking scope narrowing from benign cosmetic edits.
* **Empirical Results:**
  - **Validation MSE Loss:** Reduced from **0.0554** (pretrained base) to **0.0376** (**-32.2% error reduction**).
  - **Pearson Correlation ($r$):** Increased from **0.105** to **0.368** (**+251% correlation gain**).
  - **Model Artifact:** Saved to `backend/models/student2_semantic/`.

---

### 5.3 Student 3: KS Arjun (Behavioral Deontic Extraction, Risk Scoring & Client Migration)
* **Objective:** Extract linguistic contracts (modal verbs), detect precondition tightening, synthesize all evidence into an API Breaking Risk Score (0–100), and generate multi-language client remediation code.
* **Core Code Files:**
  - [`backend/app/nlp/behavioral_analyzer.py`](file:///c:/Users/Tanmay/Desktop/collegeProject/NLP/backend/app/nlp/behavioral_analyzer.py): spaCy matcher for modal verbs, preconditions, rate limits, and async cues.
  - [`backend/app/nlp/impact_analyzer.py`](file:///c:/Users/Tanmay/Desktop/collegeProject/NLP/backend/app/nlp/impact_analyzer.py): Multi-source synthesis and composite risk calculation.
  - [`backend/app/nlp/migration_recommender.py`](file:///c:/Users/Tanmay/Desktop/collegeProject/NLP/backend/app/nlp/migration_recommender.py): Generates executable Before/After migration snippets.
  - [`backend/training/train_student3_behavioral.py`](file:///c:/Users/Tanmay/Desktop/collegeProject/NLP/backend/training/train_student3_behavioral.py): Dual-head model training pipeline.
  - [`frontend/src/pages/BehavioralImpactPage.tsx`](file:///c:/Users/Tanmay/Desktop/collegeProject/NLP/frontend/src/pages/BehavioralImpactPage.tsx): Dedicated UI with deontic sandbox.
* **Linguistic Grammar & Dual-Head Classifier:**
  - **Grammar Engine:** `spaCy en_core_web_sm` token matcher detecting:
    - *Obligations:* `must`, `shall`, `required to`, `mandatory`
    - *Prohibitions:* `must not`, `shall not`, `cannot`, `forbidden`
    - *Permissions:* `may`, `can`, `optional`, `permitted`
    - *Preconditions / Quotas:* `prior to`, `rate limit`, `HTTP 429`, `idempotency`
  - **Dual-Head Classifier Architecture:**
    - **Head A (Deontic Modality):** `TfidfVectorizer(ngram_range=(1, 3), max_features=1200)` + `MLPClassifier(hidden_layer_sizes=(64, 32), activation="relu", max_iter=300)`.
    - **Head B (Breaking Severity):** `TfidfVectorizer(ngram_range=(1, 2), max_features=800)` + `LogisticRegression(C=2.0, max_iter=500)`.
* **API Breaking Risk Score Formulation ($R \in [0, 100]$):**
  $$R = \frac{\sum_{i=1}^{N} w_i}{\max(1, N)} \times 100$$
  Where finding weights $w_i$ are:
  - `STRUCTURAL_BREAKING` $= 1.0$
  - `BEHAVIORAL_BREAKING` $= 1.0$
  - `DUAL_BREAKING` $= 1.0$
  - `POTENTIALLY_BREAKING` $= 0.5$
  - `NON_BREAKING` $= 0.0$
* **Automated Client Remediation Snippets:**
  - Generates syntactically validated code in **cURL**, **Python (Requests)**, and **TypeScript (Axios)** covering asynchronous polling (handling HTTP 202), mandatory headers, rate limit retries, and pagination updates.
* **Empirical Results:**
  - **Head A Modality Accuracy:** **94.4%** ($F_1 = 94.1\%$)
  - **Head B Severity Accuracy:** **55.6%** ($F_1 = 51.2\%$)
  - **Code Generation Syntactic Validity:** **100.0%** across all 3 client languages.
  - **Model Artifact:** Saved to `backend/models/student3_behavioral/model.joblib`.

---

## 📈 6. Comprehensive Empirical Evaluation & Benchmark Results

### 6.1 Benchmark Comparison Table
Evaluated across 45 curated API evolution cases comparing the traditional AST baseline against our full NLP-enhanced engine:

| Evaluation Metric | Pure Structural Diff Baseline | Proposed Dual NLP Engine (Ours) | Absolute Delta | Relative Gain |
| :--- | :---: | :---: | :---: | :---: |
| **Precision** | **100.0%** | **95.2%** | -4.8% | Preserves High Precision |
| **Recall** | **28.6%** | **71.4%** | **+42.8%** | **+150% Relative Recall** |
| **F1-Score** | **44.4%** | **81.6%** | **+37.2%** | **+83.8% Overall F1** |
| **Accuracy** | **55.6%** | **80.0%** | **+24.4%** | **+43.9% Accuracy** |

*(Note: On the focused 8-case canonical behavioral test suite in `evaluation_cases.json`, recall reaches **100.0%** vs. the baseline's **16.7%**).*

### 6.2 Confusion Matrix Breakdown
- **Pure Structural Diff Baseline:**
  - True Positives (TP): 8 (caught only explicit route deletions and required flag changes)
  - False Negatives (FN): **20 (completely missed 20 breaking changes disguised in text!)**
  - False Positives (FP): 0
  - True Negatives (TN): 17
- **Proposed NLP-Enhanced System:**
  - True Positives (TP): **20 (identified 12 additional silent behavioral breaks)**
  - False Negatives (FN): **8**
  - False Positives (FP): **1**
  - True Negatives (TN): **16**

---

## 📁 7. Repository Structure & Key File Map

```
c:\Users\Tanmay\Desktop\collegeProject\NLP\
├── PROJECT_CONTEXT.md                     # <-- THIS FILE: Master reference context
├── README.md                              # High-level repo summary and quickstart
├── build_panel_a_report.py                # Python-docx script generating 24-figure formal report
├── Panel_A_API_Evolution_NLP_Team4.docx   # Generated 28-page formal academic report
├── Panel_A_API_Evolution_NLP_Team4.pdf    # PDF version for faculty submission
│
├── backend/                               # FastAPI Python 3.10+ Backend
│   ├── app/
│   │   ├── main.py                        # FastAPI entrypoint, CORS, route registration
│   │   ├── api/routes/
│   │   │   ├── analyses.py                # Full analysis orchestrator endpoint
│   │   │   ├── specifications.py          # Specification upload & parse endpoints
│   │   │   ├── evaluation.py              # Benchmark & student model metrics endpoints
│   │   │   ├── exports.py                 # JSON, CSV, printable HTML export endpoints
│   │   │   └── health.py                  # API health check
│   │   ├── nlp/
│   │   │   ├── structural_diff.py         # Student 1: AST tree diffing logic
│   │   │   ├── semantic_analyzer.py       # Student 2: Dense sentence embeddings & drift
│   │   │   ├── text_preprocessor.py       # Text cleaner & markdown normalizer
│   │   │   ├── behavioral_analyzer.py     # Student 3: spaCy deontic extraction
│   │   │   ├── impact_analyzer.py         # Student 3: Risk scoring (0-100) & classification
│   │   │   └── migration_recommender.py   # Multi-language code snippet generator
│   │   ├── services/
│   │   │   ├── specification_parser.py    # OpenAPI/Swagger parser with recursive $ref
│   │   │   ├── analysis_orchestrator.py   # Master pipeline coordinator
│   │   │   └── report_service.py          # HTML/CSV export builder
│   │   ├── repositories/
│   │   │   └── analysis_repository.py     # SQLite persistence manager
│   │   └── tests/                         # 20 Automated Unit & Integration Tests
│   │       ├── test_parser.py             # Tests OpenAPI parsing & $ref resolution
│   │       ├── test_structural_diff.py    # Tests Student 1 structural logic
│   │       ├── test_semantic_analyzer.py  # Tests Student 2 cosine similarity & drift
│   │       ├── test_behavioral_analyzer.py# Tests Student 3 deontic matching
│   │       ├── test_impact_analyzer.py    # Tests composite breaking classification
│   │       └── test_orchestrator.py       # End-to-end integration test
│   │
│   ├── data/
│   │   ├── analysis_history.db            # SQLite persistence database
│   │   ├── evaluation_cases.json          # Canonical ground-truth evaluation cases
│   │   └── corpus/                        # Academic training & evaluation corpora
│   │       ├── api_structural_corpus.json # Student 1 training corpus (N=126)
│   │       ├── api_semantic_sts_corpus.json # Student 2 training corpus (N=36 pairs)
│   │       ├── api_behavioral_corpus.json # Student 3 training corpus (N=126)
│   │       └── apistic/                   # APIstic commit evolution slices (Stripe, GitHub, etc.)
│   │
│   ├── models/                            # Trained student model checkpoints & metrics
│   │   ├── student1_structural/           # model.joblib + metrics.json (91.7% acc)
│   │   ├── student2_semantic/             # Fine-tuned all-MiniLM-L6-v2 + config
│   │   └── student3_behavioral/           # model.joblib + metrics.json (94.4% acc)
│   │
│   └── training/                          # Automated training pipelines
│       ├── train_all.py                   # Master script: trains all 3 students sequentially
│       ├── train_student1_structural.py   # Trains Student 1 MLPClassifier
│       ├── train_student2_semantic.py     # Fine-tunes Student 2 Bi-Encoder Transformer
│       ├── train_student3_behavioral.py   # Trains Student 3 Dual-Head Classifier
│       └── expand_datasets.py             # Mines additional APIstic slices
│
├── frontend/                              # React 19 + TypeScript + Vite Dashboard
│   ├── src/
│   │   ├── App.tsx                        # Root application component with routing
│   │   ├── components/                    # Sidebar, TopNav, BenchmarkView, etc.
│   │   ├── pages/
│   │   │   ├── OverviewPage.tsx           # Metrics dashboard & Recharts distributions
│   │   │   ├── NewAnalysisPage.tsx        # Drag-and-drop spec uploader
│   │   │   ├── AnalysisDetailPage.tsx     # Full tabbed analysis report & export actions
│   │   │   ├── StructuralDiffPage.tsx     # Student 1 sandbox & AST inspector
│   │   │   ├── SemanticAnalysisPage.tsx   # Student 2 sandbox for text drift testing
│   │   │   ├── BehavioralImpactPage.tsx   # Student 3 sandbox for deontic extraction
│   │   │   ├── HistoryPage.tsx            # Historical SQLite analyses viewer
│   │   │   └── EvaluationPage.tsx         # Academic benchmark & student models dashboard
│   │   └── services/api.ts                # Axios client communicating with FastAPI
│   └── package.json
│
├── docs/                                  # Detailed Markdown documentation
│   ├── architecture.md                    # System architecture & layers
│   ├── methodology.md                     # Mathematical formulas & deontic grammar
│   ├── evaluation.md                      # Benchmark tables & confusion matrix analysis
│   ├── api-documentation.md               # Complete REST API route documentation
│   └── member-task-allocation.md          # Formal student contribution breakdown
│
└── VISUALISATIONS/                        # 24 Generated Academic Figures & Plots
    ├── generate_all_visualisations.py     # Matplotlib/Seaborn script generating all 24 plots
    └── *.png                              # Individual high-res publication figures
```

---

## 🌐 8. Complete REST API Reference (FastAPI Backend)

| HTTP Method | Endpoint Path | Function & Role |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check returning status `healthy` and version. |
| `POST` | `/api/specifications/parse` | Parses raw YAML/JSON OpenAPI/Swagger text, resolves `$ref`, returns normalized AST. |
| `POST` | `/api/analyses/run` | Executes complete tri-tier analysis between v1 and v2 specs; stores result in SQLite. |
| `GET` | `/api/analyses` | Retrieves all historical analyses stored in SQLite. |
| `GET` | `/api/analyses/{id}` | Retrieves full detailed results, findings, and migration guides for analysis `{id}`. |
| `POST` | `/api/analyses/structural` | **Student 1 Endpoint:** Runs isolated AST diffing on two specifications. |
| `POST` | `/api/analyses/semantic` | **Student 2 Endpoint:** Runs isolated semantic vector drift analysis. |
| `POST` | `/api/semantic-test` | **Student 2 Sandbox:** Evaluates semantic similarity & drift between arbitrary text strings. |
| `POST` | `/api/analyses/behavioral` | **Student 3 Endpoint:** Runs isolated spaCy deontic extraction & rule synthesis. |
| `GET` | `/api/evaluation/benchmark` | Runs academic benchmark against ground truth; returns precision, recall, and confusion matrix. |
| `GET` | `/api/evaluation/student-models`| Returns trained accuracy, loss, and corpus metrics for all 3 student models. |
| `GET` | `/api/evaluation/dataset-provenance`| Returns official APIstic and Java Evolution citations and dataset metadata. |
| `GET` | `/api/exports/{id}/json` | Exports analysis results as machine-readable JSON. |
| `GET` | `/api/exports/{id}/csv` | Exports findings table as flat CSV. |
| `GET` | `/api/exports/{id}/html` | Generates self-contained, printable HTML report with print-ready CSS. |

---

## 🎓 9. Viva / Panel Defense Q&A Cheatsheet (Dr. Suja Panicker / Evaluators)

### Q1: Why did you use TF-IDF + MLP instead of simpler models like Naive Bayes or Logistic Regression?
* **Answer:**  
  1. **Violation of Feature Independence:** Naive Bayes assumes all features are conditionally independent. In technical API diffs, word order and combination are paramount (*"optional to required"* is breaking, whereas *"required to optional"* is non-breaking). Naive Bayes fails on these inverted phrases.  
  2. **Non-Linear Decision Boundaries:** Logistic Regression is strictly linear. An MLP with hidden layers (`64 -> 32`) and ReLU activations learns non-linear interactions between technical parameter cues and change directions without manual feature engineering.  
  3. **High-Dimensional Sparse Spaces:** TF-IDF generates sparse 800–1200 dimensional vectors where single Decision Trees overfit; MLPs perform dense weight distributions smoothly.  
  4. **Softmax Probability Calibration:** The MLP outputs continuous probability scores (`predict_proba`) needed to calibrate confidence in our downstream risk score.

### Q2: Why didn't you use BERT or GPT for everything?
* **Answer:**  
  1. **Severe Overfitting on Small Corpora:** Heavy transformers (110M+ parameters) severely overfit when fine-tuned on specialized domain datasets of ~100–200 samples. TF-IDF + MLP has ~50k parameters, converging stably.  
  2. **Inference Latency & CI/CD Suitability:** API diffing runs inside developer CI/CD pipelines. TF-IDF + MLP trains in **0.28 seconds** and runs in **<1 ms** on a standard CPU. Calling an LLM or BERT on 100 endpoints would introduce seconds of latency and API cost.  
  3. **Role Partitioning:** We strategically reserved transformer embeddings for Student 2 (`all-MiniLM-L6-v2`) where sentence-level semantic nuance is genuinely required, creating a fast, cost-effective hybrid architecture.

### Q3: What is `all-MiniLM-L6-v2` and why was it chosen for Student 2?
* **Answer:** It is a 6-layer distilled Sentence-Transformer mapping sentences into a 384-dimensional dense vector space. It provides 5x faster inference than `bert-base` with 99% of its semantic performance, making it the industry standard for real-time semantic textual similarity (STS).

### Q4: What is Deontic Modality in Student 3's task?
* **Answer:** Deontic modality is the linguistic expression of duty, obligation, and permission. In software contracts:
  - **Obligation** (*must*, *shall*, *mandatory*) $\rightarrow$ Hard requirements; breaking if added.
  - **Prohibition** (*must not*, *cannot*, *forbidden*) $\rightarrow$ Restrictive invariants; breaking if expanded.
  - **Permission** (*may*, *can*, *optional*) $\rightarrow$ Caller discretion; non-breaking.  
  Using `spaCy`, we extract these clauses and detect when a permission flips to an obligation.

### Q5: How is the composite API Breaking Risk Score (0–100) calculated?
* **Answer:** It is a weighted aggregation of findings across all endpoints:
  $$R = \frac{\sum w_i}{\max(1, N)} \times 100$$
  Breaking findings (`STRUCTURAL_BREAKING`, `BEHAVIORAL_BREAKING`, `DUAL_BREAKING`) carry weight $1.0$, `POTENTIALLY_BREAKING` carries $0.5$, and `NON_BREAKING` carries $0.0$.

---

## ⚡ 10. Operational Quickstart & Verification Commands

### Step 1: Start Backend
```powershell
cd c:\Users\Tanmay\Desktop\collegeProject\NLP\backend
pip install -r requirements.txt
python -m spacy download en_core_web_sm
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
- Interactive Swagger UI: `http://127.0.0.1:8000/docs`

### Step 2: Run Full Automated Test Suite (20 Tests Passing)
```powershell
cd c:\Users\Tanmay\Desktop\collegeProject\NLP\backend
python -m pytest app/tests/ -v
```

### Step 3: Retrain All 3 Student NLP Models
```powershell
cd c:\Users\Tanmay\Desktop\collegeProject\NLP
python backend/training/train_all.py
```

### Step 4: Start Frontend Dashboard
```powershell
cd c:\Users\Tanmay\Desktop\collegeProject\NLP\frontend
npm install
npm run dev -- --host 127.0.0.1
```
- Dashboard URL: `http://127.0.0.1:5173/`

### Step 5: Regenerate Report & Visualizations
```powershell
cd c:\Users\Tanmay\Desktop\collegeProject\NLP
python VISUALISATIONS\generate_all_visualisations.py
python build_panel_a_report.py
```
