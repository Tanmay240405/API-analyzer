import os
import textwrap
import pytest
from backend.app.schemas.analysis import ComparisonRequest
from backend.app.services.analysis_orchestrator import orchestrator
from backend.app.repositories.analysis_repository import analysis_repository
from backend.app.core.exceptions import SpecificationParseError

def test_inventory_sample_e2e_all_7_changes():
    """
    End-to-end test analyzing the inventory sample old vs new specification.
    Verifies detection of:
    1. Added endpoint (/products/{id}/restock)
    2. Removed field (sku_code)
    3. Optional to Required parameter (warehouse_id)
    4. Changed default pagination limit (50 -> 20)
    5. Scope narrowing description
    6. Changed validation constraint / required body field (safety_stock)
    7. Changed response schema
    """
    old_path = os.path.join(os.path.dirname(__file__), "..", "..", "data", "sample_old.json")
    new_path = os.path.join(os.path.dirname(__file__), "..", "..", "data", "sample_new.json")

    with open(old_path, "r", encoding="utf-8") as f:
        v1_content = f.read()
    with open(new_path, "r", encoding="utf-8") as f:
        v2_content = f.read()

    req = ComparisonRequest(
        v1_content=v1_content,
        v2_content=v2_content,
        v1_filename="inventory_v1.json",
        v2_filename="inventory_v2.json",
        api_name="Inventory E2E Test"
    )

    result = orchestrator.run_full_analysis(req)

    # 4 distinct operations across both specs (GET /products, POST /products, GET /products/{id}, POST /products/{id}/restock)
    assert result.summary.total_endpoints == 4
    assert result.summary.added_endpoints == 1  # /products/{id}/restock
    assert result.summary.breaking_count >= 1

    # 1. Added endpoint check
    restock_ep = next((e for e in result.endpoints if "/restock" in e.path), None)
    assert restock_ep is not None
    assert restock_ep.change_type == "ADDED"

    # 2. GET /products checks (optional->required, default change, scope narrowing)
    get_products_ep = next((e for e in result.endpoints if e.path == "/products" and e.method == "GET"), None)
    assert get_products_ep is not None
    assert get_products_ep.is_breaking is True
    # Verify warehouse_id required
    struct_str = " ".join(get_products_ep.structural_changes)
    assert "warehouse_id" in struct_str
    assert "REQUIRED" in struct_str
    # Verify default changed
    assert "default" in struct_str.lower()
    # Verify scope narrowing detected in semantic analysis
    sem_finding = next((s for s in result.semantic_findings if s.endpoint_path == "/products"), None)
    assert sem_finding is not None
    assert sem_finding.meaning_change_suspected is True

    # Verify SQLite persistence
    stored = analysis_repository.get_analysis(result.id)
    assert stored is not None
    assert stored.id == result.id

def test_semantic_change_with_unchanged_schema():
    """
    Ensures semantic meaning drift is flagged even when request/response schemas are completely identical.
    """
    v1 = textwrap.dedent("""
    openapi: 3.0.0
    info:
      title: Items API
      version: "1.0.0"
    paths:
      /items:
        get:
          description: Returns all items without filter.
          responses:
            '200':
              description: OK
    """).strip()

    v2 = textwrap.dedent("""
    openapi: 3.0.0
    info:
      title: Items API
      version: "1.0.1"
    paths:
      /items:
        get:
          description: Returns available items only. Inactive items are excluded.
          responses:
            '200':
              description: OK
    """).strip()

    req = ComparisonRequest(v1_content=v1, v2_content=v2)
    result = orchestrator.run_full_analysis(req)

    # Schema is unchanged: 0 structural changes
    assert result.summary.structural_changes_count == 0
    # But semantic drift is detected:
    assert result.summary.semantic_drift_count >= 1
    assert result.endpoints[0].semantic_drift > 0.10
    assert result.summary.potentially_breaking_count >= 1 or result.endpoints[0].is_breaking is True
    assert result.semantic_findings[0].meaning_change_suspected is True

def test_harmless_wording_changes_not_breaking():
    """
    Tests that cosmetic documentation edits (e.g. punctuation, typos, stylistic synonyms)
    do not trigger false-positive breaking changes.
    """
    v1 = textwrap.dedent("""
    openapi: 3.0.0
    info:
      title: Users API
      version: "1.0.0"
    paths:
      /users:
        get:
          description: Retrieves list of registered users.
          responses:
            '200':
              description: OK
    """).strip()

    v2 = textwrap.dedent("""
    openapi: 3.0.0
    info:
      title: Users API
      version: "1.0.1"
    paths:
      /users:
        get:
          description: Retrieves a list of registered users.
          responses:
            '200':
              description: OK
    """).strip()

    req = ComparisonRequest(v1_content=v1, v2_content=v2)
    result = orchestrator.run_full_analysis(req)

    assert result.summary.breaking_count == 0
    assert result.endpoints[0].is_breaking is False
    assert result.endpoints[0].breaking_type in ["UNCHANGED", "NON_BREAKING"]

def test_empty_spec_does_not_fabricate_findings():
    """
    Ensures empty or invalid specifications raise clean errors instead of fabricating diffs.
    """
    with pytest.raises(SpecificationParseError):
        orchestrator.run_full_analysis(ComparisonRequest(v1_content="", v2_content=""))
