import pytest
from backend.app.nlp.impact_analyzer import ImpactAnalyzer
from backend.app.nlp.migration_recommender import MigrationRecommender
from backend.app.schemas.change import (
    StructuralChangeRecord,
    SemanticFinding,
    BehavioralFinding,
    ChangeClassification,
    ChangeSeverity
)

def test_impact_classification_synthesis():
    impact_analyzer = ImpactAnalyzer()
    recommender = MigrationRecommender()

    struct_changes = [
        StructuralChangeRecord(
            id="s1",
            endpoint_path="/payments",
            http_method="POST",
            component_path="parameters.idempotency_key",
            change_type="PARAMETER_REQUIRED_ADDED",
            old_value="optional",
            new_value="required",
            severity=ChangeSeverity.HIGH,
            preliminary_classification=ChangeClassification.BREAKING,
            explanation="Parameter 'idempotency_key' changed from optional to REQUIRED."
        )
    ]

    beh_findings = [
        BehavioralFinding(
            id="b1",
            endpoint_path="/payments",
            http_method="POST",
            category="execution_model_changed",
            severity=ChangeSeverity.HIGH,
            classification=ChangeClassification.BREAKING,
            observed_in_spec=False,
            evidence="Requests are now enqueued asynchronously.",
            explanation="Execution model changed from synchronous immediate to asynchronous worker queue."
        )
    ]

    impact = impact_analyzer.assess_endpoint_impact(
        endpoint_path="/payments",
        http_method="POST",
        structural_changes=struct_changes,
        semantic_findings=[],
        behavioral_findings=beh_findings
    )

    assert impact.classification == ChangeClassification.BREAKING
    assert impact.severity in [ChangeSeverity.HIGH, ChangeSeverity.CRITICAL]
    assert len(impact.evidence) == 2
    assert "rejection" in impact.affected_consumer_behavior.lower() or "rejected" in impact.affected_consumer_behavior.lower()

    guidance, snippets = recommender.generate_recommendations(
        endpoint_path="/payments",
        http_method="POST",
        structural_changes=struct_changes,
        semantic_findings=[],
        behavioral_findings=beh_findings
    )

    assert "idempotency_key" in guidance
    assert "curl" in snippets
    assert "python" in snippets
    assert "typescript" in snippets
    assert "202" in snippets["curl"].after_code
