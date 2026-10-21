# REST API Documentation

The backend exposes a high-performance RESTful API documented via OpenAPI / Swagger at `http://127.0.0.1:8000/docs`.

---

## 1. Health & Status

### `GET /api/health`
Checks backend service availability and reports model loading status separately from service readiness.

**Response (HTTP 200):**
```json
{
  "status": "healthy",
  "service_status": "operational",
  "model_status": "ready",
  "embedding_model": {
    "model_name": "sentence-transformers/all-MiniLM-L6-v2",
    "is_loaded": true,
    "backend": "SentenceTransformers (all-MiniLM-L6-v2)"
  },
  "spacy_available": true,
  "database": "SQLite operational"
}
```

---

## 2. Specification Management

### `POST /api/specifications/validate`
Validates OpenAPI 3.x or Swagger 2.0 specifications in JSON or YAML format.

**Request Body:**
```json
{
  "content": "openapi: 3.0.0\ninfo:\n  title: Sample API\n...",
  "filename": "openapi.yaml"
}
```

**Response (HTTP 200):**
```json
{
  "is_valid": true,
  "title": "Sample API",
  "version": "1.0.0",
  "openapi_version": "3.0.0",
  "endpoint_count": 3,
  "errors": [],
  "warnings": []
}
```

### `GET /api/samples`
Returns bundled sample projects (including the Inventory & Product Catalog API) for immediate end-to-end evaluation.

---

## 3. Analysis Pipeline Endpoints

### `POST /api/analyses/full`
Executes the full comparison pipeline across structural diff, semantic analysis, behavioral extraction, and impact classification. Persists the result in SQLite.

**Request Body:**
```json
{
  "v1_content": "<string: specification v1 YAML or JSON>",
  "v2_content": "<string: specification v2 YAML or JSON>",
  "v1_filename": "inventory_v1.json",
  "v2_filename": "inventory_v2.json",
  "api_name": "Inventory Service Evolution",
  "description": "Quarterly release comparison"
}
```

**Response (HTTP 200):**
```json
{
  "id": "4e70fc3a-5065-4758-a43d-838413b5fce4",
  "created_at": "2026-10-15T22:48:02.114069",
  "name": "Inventory Service Evolution",
  "summary": {
    "total_endpoints": 4,
    "added_endpoints": 1,
    "removed_endpoints": 0,
    "modified_endpoints": 3,
    "breaking_count": 2,
    "potentially_breaking_count": 1,
    "non_breaking_count": 1,
    "overall_risk_score": 50.0
  },
  "endpoints": [ ... ],
  "structural_changes": [ ... ],
  "semantic_findings": [ ... ],
  "behavioral_findings": [ ... ]
}
```

### `POST /api/analyses/structural`
Executes structural comparison independently without invoking NLP models.

### `POST /api/analyses/semantic`
Compares two documentation strings and returns cosine similarity and detected contradictions.

### `POST /api/semantic-test`
Independent sandbox testing endpoint evaluating semantic similarity and deontic shifts for paired descriptions.

---

## 4. Analysis History & Management

### `GET /api/analyses`
Returns paginated analysis history from SQLite.
- Query parameters: `limit` (default: 50), `offset` (default: 0).

### `GET /api/analyses/{analysis_id}`
Retrieves complete analysis report by ID.

### `DELETE /api/analyses/{analysis_id}`
Deletes an analysis record and cascades deletion through summaries and findings.

---

## 5. Report Exports

### `GET /api/analyses/{analysis_id}/export?format=json|csv|html`
Exports the specified report:
- `format=json`: Complete structured diff and metrics payload.
- `format=csv`: Tabular CSV with method, path, severity, similarity, and guidance.
- `format=html`: Standalone styled document formatted with `@media print` for PDF generation.

---

## 6. Academic Evaluation

### `POST /api/evaluation/run`
Executes benchmark comparison on labeled test cases, recording metrics in SQLite.

### `GET /api/evaluation/results`
Retrieves baseline vs. NLP-enhanced precision, recall, F1-scores, and confusion matrices.
