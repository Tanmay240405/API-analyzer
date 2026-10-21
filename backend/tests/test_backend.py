import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.comparator.parser import OpenAPIParser
from backend.nlp.extractor import LinguisticContractExtractor
from backend.nlp.embeddings import embedding_engine
from backend.comparator.structural_diff import StructuralComparator
from backend.nlp.behavioral_diff import BehavioralComparator
from backend.comparator.classifier import APIChangeClassifier

client = TestClient(app)

SAMPLE_V1_YAML = """
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths:
  /items:
    get:
      summary: List items
      description: Returns list of items. Caller may optionally pass filter string.
      parameters:
        - name: filter
          in: query
          required: false
          schema:
            type: string
      responses:
        '200':
          description: Success
"""

SAMPLE_V2_YAML = """
openapi: 3.0.0
info:
  title: Test API
  version: 2.0.0
paths:
  /items:
    get:
      summary: List items
      description: Returns list of items. Caller must provide authentication token. Mandatory requirement. Rate limited to 100 req/min.
      parameters:
        - name: filter
          in: query
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Success
"""

def test_parser_extracts_endpoints():
    parser = OpenAPIParser(SAMPLE_V1_YAML)
    endpoints = parser.extract_endpoints()
    assert "GET /items" in endpoints
    ep = endpoints["GET /items"]
    assert ep["summary"] == "List items"
    assert len(ep["parameters"]) == 1
    assert ep["parameters"][0]["name"] == "filter"
    assert ep["parameters"][0]["required"] is False

def test_linguistic_contract_extractor():
    extractor = LinguisticContractExtractor()
    text = "Caller must provide authentication token. Mandatory requirement. Rate limited to 100 req/min. Throws 403 when quota exceeded."
    contract = extractor.extract_contracts(text)
    assert len(contract.modalities.obligation) > 0
    assert len(contract.preconditions) > 0
    assert len(contract.rate_limits) > 0

def test_embeddings_semantic_similarity():
    # Identical texts
    sim_identical = embedding_engine.compute_similarity("Process payment receipt", "Process payment receipt")
    assert sim_identical == 1.0

    # Semantically close texts
    sim_close = embedding_engine.compute_similarity("Process payment receipt", "Execute billing transaction")
    assert sim_close > 0.50

    # Semantically drifted texts
    sim_drifted = embedding_engine.compute_similarity("Permanently delete user record", "Flag account as temporarily inactive")
    drift = embedding_engine.compute_semantic_drift("Permanently delete user record", "Flag account as temporarily inactive")
    assert drift > 0.20

def test_structural_diff():
    p1 = OpenAPIParser(SAMPLE_V1_YAML).extract_endpoints()["GET /items"]
    p2 = OpenAPIParser(SAMPLE_V2_YAML).extract_endpoints()["GET /items"]
    diff = StructuralComparator()
    changes, is_breaking, reasons = diff.compare_endpoints(p1, p2)
    assert is_breaking is True
    assert any("REQUIRED" in r for r in reasons)

def test_behavioral_diff():
    extractor = LinguisticContractExtractor()
    c1 = extractor.extract_contracts("Processes card payments synchronously and returns transaction receipt immediately upon settlement.")
    c2 = extractor.extract_contracts("Enqueues payment request into background worker queue. Returns asynchronous task token.")
    comparator = BehavioralComparator()
    sim, drift, diffs, is_breaking = comparator.compare_behaviors(
        "", "Processes card payments synchronously and returns transaction receipt immediately upon settlement.",
        "", "Enqueues payment request into background worker queue. Returns asynchronous task token.",
        c1, c2
    )
    assert is_breaking is True
    assert any(d.category == "postcondition_altered" for d in diffs)

def test_fastapi_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"

def test_fastapi_benchmark():
    response = client.get("/api/evaluation/benchmark")
    assert response.status_code == 200
    data = response.json()
    assert "nlp_enhanced" in data
    assert "structural_only" in data
    assert data["nlp_enhanced"]["recall"] > data["structural_only"]["recall"]

def test_fastapi_compare_endpoint():
    payload = {
        "v1_content": SAMPLE_V1_YAML,
        "v2_content": SAMPLE_V2_YAML,
        "v1_filename": "v1.yaml",
        "v2_filename": "v2.yaml"
    }
    response = client.post("/api/compare", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["total_endpoints"] == 1
    assert data["breaking_count"] == 1
    assert data["risk_score"] > 0
    assert len(data["endpoints"]) == 1
    ep = data["endpoints"][0]
    assert ep["is_breaking"] is True
    assert ep["code_migration"] is not None
    assert "curl" in ep["code_migration"]
    assert "python" in ep["code_migration"]
    assert "typescript" in ep["code_migration"]
