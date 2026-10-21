import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

SAMPLE_V1 = """
openapi: 3.0.0
info:
  title: Test API
  version: "1.0.0"
paths:
  /items:
    get:
      summary: Get items
      description: Returns active store items.
      responses:
        '200':
          description: Ok
"""

SAMPLE_V2 = """
openapi: 3.0.0
info:
  title: Test API
  version: "2.0.0"
paths:
  /items:
    get:
      summary: Get items
      description: Returns available store items only.
      parameters:
        - name: filter
          in: query
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Ok
"""

def test_api_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "embedding_model" in data

def test_api_validate_spec():
    res = client.post("/api/specifications/validate", json={"content": SAMPLE_V1, "filename": "spec.yaml"})
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is True
    assert data["title"] == "Test API"
    assert data["endpoint_count"] == 1

def test_api_full_comparison_and_export():
    res = client.post("/api/analyses/full", json={
        "v1_content": SAMPLE_V1,
        "v2_content": SAMPLE_V2,
        "api_name": "Integration Test API"
    })
    assert res.status_code == 200
    data = res.json()
    analysis_id = data["id"]
    assert "summary" in data
    assert data["summary"]["breaking_count"] >= 1
    assert len(data["endpoints"]) == 1

    # Test export CSV
    csv_res = client.get(f"/api/analyses/{analysis_id}/export?format=csv")
    assert csv_res.status_code == 200
    assert "Method,Path,ChangeType" in csv_res.text

    # Test export HTML
    html_res = client.get(f"/api/analyses/{analysis_id}/export?format=html")
    assert html_res.status_code == 200
    assert "<!DOCTYPE html>" in html_res.text

def test_api_semantic_sandbox():
    res = client.post("/api/semantic-test", json={
        "text_v1": "Returns all products without filter.",
        "text_v2": "Returns available products only. Archived records are excluded."
    })
    assert res.status_code == 200
    data = res.json()
    assert "semantic_similarity" in data
    assert "semantic_drift" in data
    assert data["semantic_similarity"] < 0.90
    assert data["is_breaking"] is True

def test_api_evaluation_benchmark():
    res = client.post("/api/evaluation/run")
    assert res.status_code == 200
    data = res.json()
    assert data["total_cases"] >= 8
    assert "nlp_enhanced" in data
    assert "structural_only" in data
    assert data["nlp_enhanced"]["recall"] > data["structural_only"]["recall"]
