import pytest
from backend.app.nlp.behavioral_analyzer import BehavioralAnalyzer
from backend.app.schemas.change import ChangeClassification

def test_deontic_modalities_and_contracts_extraction():
    analyzer = BehavioralAnalyzer()
    text = (
        "Processes payment transactions. "
        "Caller must provide valid authorization token. "
        "Clients must not exceed rate limit. "
        "Users may optionally include tracking tags. "
        "Requests are enqueued asynchronously into background worker queue. "
        "Endpoint is strictly rate limited to 50 req/min. "
        "This version is deprecated and will be removed."
    )

    contract = analyzer.extract_contracts(text)

    # Deontic logic
    assert len(contract.modalities.obligation) >= 1
    assert any("must provide" in s.lower() for s in contract.modalities.obligation)

    assert len(contract.modalities.prohibition) >= 1
    assert any("must not" in s.lower() for s in contract.modalities.prohibition)

    assert len(contract.modalities.permission) >= 1
    assert any("may optionally" in s.lower() for s in contract.modalities.permission)

    # Contract attributes
    assert len(contract.postconditions) >= 1
    assert len(contract.rate_limits) >= 1
    assert len(contract.deprecations) >= 1

def test_behavioral_comparator_detects_tightened_obligations():
    analyzer = BehavioralAnalyzer()
    t1 = "Caller may optionally supply idempotency_key."
    t2 = "Mandatory requirement: caller must provide valid idempotency_key."

    c1 = analyzer.extract_contracts(t1)
    c2 = analyzer.extract_contracts(t2)

    findings = analyzer.compare_contracts("/charges", "POST", c1, c2)
    categories = [f.category for f in findings]

    assert "deontic_obligation_tightened" in categories or "precondition_tightened" in categories
    assert any(f.classification == ChangeClassification.BREAKING for f in findings)
