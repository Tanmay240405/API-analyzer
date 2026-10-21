# System Architecture

## Overview

The **NLP-Based Semantic and Behavioral Impact Analysis of API Changes** platform provides an automated developer-tool pipeline that compares two OpenAPI/Swagger specifications, identifies structural differences, evaluates subtle natural-language semantic drift, extracts deontic contract obligations, and classifies breaking changes with grounded remediation guidance.

```
+----------------------------------------------------------------------------------------------------+
|                                      React 19 + TypeScript SPA                                      |
|  - Modern developer-tool aesthetic (Slate/Zinc neutral background, Blue accents, Dark/Light modes)  |
|  - Left Sidebar Navigation (Overview, New Analysis, Structural, Semantic, Behavioral, History...)   |
|  - Interactive Recharts Visualizations (Breakdown by Category, Severity, and Breaking Status)      |
|  - Multi-tab Executive Summary (Overview, Structural, Semantic, Behavioral, Impact, Migration)      |
|  - Manual Text-Comparison Sandbox for testing natural language drift independently                  |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                          HTTP / REST (JSON)
                                                  │
+------------------------------------------------─▼──────────────────────────────────────────────────+
|                                    FastAPI High-Performance Backend                                 |
|  ├── SpecificationParser: Loads OpenAPI 3.x / Swagger 2.0 (YAML/JSON) & resolves recursive $ref   |
|  ├── StructuralDiffEngine: Component-level deterministic comparison (Task 1)                        |
|  ├── SemanticAnalyzer: 384-dim dense vectors via SentenceTransformers all-MiniLM-L6-v2 (Task 2)    |
|  ├── BehavioralAnalyzer: spaCy en_core_web_sm deontic extraction & precondition audits (Task 3A)   |
|  ├── ImpactAnalyzer: Deterministic rule synthesis (BREAKING, NON_BREAKING, POTENTIALLY) (Task 3B)  |
|  ├── MigrationRecommender: Multi-language code snippets (cURL, Python Requests, TypeScript Axios)  |
|  ├── AnalysisRepository: Local SQLite persistence (analyses, summaries, findings, evaluation_runs)  |
|  └── ReportService: JSON, CSV, and self-contained Printable HTML report export generation          |
+----------------------------------------------------------------------------------------------------+
```

## Layered Component Breakdown

### 1. Presentation Layer (`frontend/`)
- Built with React 19, TypeScript, Vite, and Tailwind CSS.
- **`Sidebar` & `TopNav`**: Navigation system providing access to all 8 operational routes.
- **`OverviewPage`**: Real-time aggregate statistics from SQLite (analyses count, structural changes, semantic flags, breaking changes) and Recharts charts.
- **`NewAnalysisPage`**: Drag-and-drop specification uploader with pre-flight validation and sample loader.
- **`AnalysisDetailPage`**: Tabbed report viewer with multi-criteria filtering (search, severity, HTTP method, breaking classification) and export actions.
- **`SemanticAnalysisPage`**: Interactive manual text sandbox to evaluate semantic drift on arbitrary text pairs.
- **`BenchmarkView`**: Displays ground-truth benchmark metrics comparing the structural baseline against our NLP-enhanced engine.

### 2. Core NLP & Analysis Services (`backend/app/nlp/`)
- **`structural_diff.py`**: Performs deterministic diffing across endpoints, HTTP verbs, parameters, types, optional-to-required flags, defaults, enums, request bodies, response schemas, and status codes.
- **`semantic_analyzer.py`**: Computes sentence embeddings using `sentence-transformers/all-MiniLM-L6-v2` and flags semantic drift. Incorporates transparent linguistic rules to detect scope narrowing, prerequisite flips, negation contradictions, and inclusion/exclusion shifts.
- **`behavioral_analyzer.py`**: Analyzes deontic modality statements (Obligation, Prohibition, Permission) and tracks precondition tightening, rate limits, deprecations, and asynchronous execution transitions.
- **`impact_analyzer.py`**: Synthesizes structural and behavioral findings into an overall risk score (0-100), severity rating, and breaking classification.
- **`migration_recommender.py`**: Produces actionable remediation advice and before/after code snippets in cURL, Python, and TypeScript.

### 3. Persistence Layer (`backend/app/repositories/`)
- Persisted in local SQLite database (`backend/data/analysis_history.db`).
- Normalized relational schema:
  - `analyses`: Core metadata, titles, versions, filenames, and raw JSON payload.
  - `analysis_summaries`: Aggregated metrics (total endpoints, breaking count, non-breaking count, duration).
  - `change_findings`: Normalized endpoint-level findings.
  - `evaluation_runs`: Stored academic benchmark runs with precision, recall, and F1 scores.
