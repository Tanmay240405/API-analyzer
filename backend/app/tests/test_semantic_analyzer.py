import pytest
from backend.app.nlp.semantic_analyzer import SemanticAnalyzer

def test_semantic_identical_text():
    analyzer = SemanticAnalyzer()
    sim = analyzer.compute_similarity(
        "Retrieves customer billing invoice history.",
        "Retrieves customer billing invoice history."
    )
    assert sim == 1.0

def test_semantic_scope_narrowing_detected():
    analyzer = SemanticAnalyzer()
    t1 = "Returns all products in the catalog without restriction."
    t2 = "Returns available products only. Out-of-stock items are omitted."

    finding = analyzer.analyze_text_pair(
        endpoint_path="/products",
        http_method="GET",
        field_name="description",
        old_text=t1,
        new_text=t2
    )

    assert finding is not None
    assert finding.meaning_change_suspected is True
    assert finding.requires_review is True
    assert "narrows" in finding.explanation.lower()
    assert finding.similarity_score < 0.90

def test_semantic_contradiction_negation():
    analyzer = SemanticAnalyzer()
    t1 = "The operation retries automatically up to 3 times on failure."
    t2 = "The operation does not retry automatically on failure."

    finding = analyzer.analyze_text_pair(
        endpoint_path="/events",
        http_method="POST",
        field_name="description",
        old_text=t1,
        new_text=t2
    )

    assert finding is not None
    assert finding.meaning_change_suspected is True
    assert "retry" in finding.explanation.lower()
