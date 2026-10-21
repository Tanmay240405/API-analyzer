import uuid
from typing import List, Dict, Optional, Tuple, Any
from backend.app.schemas.change import (
    StructuralChangeRecord,
    SemanticFinding,
    BehavioralFinding,
    ImpactRecord,
    ChangeClassification,
    ChangeSeverity
)

class ImpactAnalyzer:
    """
    Synthesizes structural diffs, NLP semantic findings, and behavioral contract shifts
    into a comprehensive impact classification with grounded reasoning and consumer risk.
    """

    def assess_endpoint_impact(
        self,
        endpoint_path: str,
        http_method: str,
        structural_changes: List[StructuralChangeRecord],
        semantic_findings: List[SemanticFinding],
        behavioral_findings: List[BehavioralFinding]
    ) -> ImpactRecord:
        evidence: List[str] = []
        is_breaking = False
        is_potentially_breaking = False
        needs_review = False
        max_severity = ChangeSeverity.INFORMATIONAL

        # 1. Structural evaluation
        for s in structural_changes:
            evidence.append(f"[Structural] {s.explanation}")
            if s.preliminary_classification == ChangeClassification.BREAKING:
                is_breaking = True
                if max_severity != ChangeSeverity.CRITICAL:
                    max_severity = s.severity
            elif s.preliminary_classification == ChangeClassification.POTENTIALLY_BREAKING:
                is_potentially_breaking = True
                if max_severity in [ChangeSeverity.INFORMATIONAL, ChangeSeverity.LOW]:
                    max_severity = s.severity

        # 2. Semantic evaluation
        for sem in semantic_findings:
            if sem.meaning_change_suspected:
                evidence.append(f"[Semantic Drift] {sem.explanation} (Sim: {sem.similarity_score:.2f})")
                if sem.similarity_score < 0.60:
                    is_breaking = True
                    max_severity = ChangeSeverity.HIGH
                else:
                    is_potentially_breaking = True
                    if max_severity in [ChangeSeverity.INFORMATIONAL, ChangeSeverity.LOW]:
                        max_severity = ChangeSeverity.MEDIUM
            if sem.requires_review:
                needs_review = True

        # 3. Behavioral contract evaluation
        for b in behavioral_findings:
            evidence.append(f"[Behavioral] {b.explanation}")
            if b.classification == ChangeClassification.BREAKING:
                is_breaking = True
                if max_severity != ChangeSeverity.CRITICAL:
                    max_severity = b.severity
            elif b.classification == ChangeClassification.POTENTIALLY_BREAKING:
                is_potentially_breaking = True
            if b.requires_review:
                needs_review = True

        # Determine Final Classification
        if is_breaking:
            classification = ChangeClassification.BREAKING
        elif is_potentially_breaking:
            classification = ChangeClassification.POTENTIALLY_BREAKING
        elif needs_review:
            classification = ChangeClassification.NEEDS_REVIEW
        else:
            classification = ChangeClassification.NON_BREAKING

        # Severity mapping
        if not is_breaking and not is_potentially_breaking:
            max_severity = ChangeSeverity.INFORMATIONAL if not structural_changes else ChangeSeverity.LOW

        # Generate Reasoning & Consumer Impact
        reasoning, consumer_behavior = self._build_reasoning(
            classification=classification,
            structural_changes=structural_changes,
            semantic_findings=semantic_findings,
            behavioral_findings=behavioral_findings
        )

        # Calibrated confidence calculation
        confidence = self._calculate_confidence(structural_changes, semantic_findings, behavioral_findings)

        return ImpactRecord(
            id=f"imp-{uuid.uuid4().hex[:8]}",
            endpoint_path=endpoint_path,
            http_method=http_method,
            classification=classification,
            severity=max_severity,
            evidence=evidence,
            reasoning=reasoning,
            affected_consumer_behavior=consumer_behavior,
            confidence_score=confidence,
            requires_manual_review=needs_review or (classification == ChangeClassification.NEEDS_REVIEW),
            migration_guidance=""  # Populated by MigrationRecommender
        )

    def _build_reasoning(
        self,
        classification: ChangeClassification,
        structural_changes: List[StructuralChangeRecord],
        semantic_findings: List[SemanticFinding],
        behavioral_findings: List[BehavioralFinding]
    ) -> Tuple[str, str]:
        reasoning_parts = []
        consumer_parts = []

        if structural_changes:
            s_reasons = [s.explanation for s in structural_changes if s.preliminary_classification == ChangeClassification.BREAKING]
            if s_reasons:
                reasoning_parts.append(f"Structural schema modifications break contract: {'; '.join(s_reasons)}.")
                consumer_parts.append("Existing client request payloads will be rejected with HTTP 400 or 422 Unprocessable Entity, or missing expected response fields will crash JSON deserialization.")

        if behavioral_findings:
            b_reasons = [b.explanation for b in behavioral_findings]
            reasoning_parts.append(f"Documented behavioral conditions tightened: {'; '.join(b_reasons)}.")
            consumer_parts.append("Callers failing to satisfy new preconditions or rate limits will encounter unexpected application state or HTTP 429 Too Many Requests.")

        if semantic_findings:
            sem_reasons = [sem.explanation for sem in semantic_findings if sem.meaning_change_suspected]
            if sem_reasons:
                reasoning_parts.append(f"NLP analysis detected significant semantic shift: {'; '.join(sem_reasons)}.")
                consumer_parts.append("Downstream consumers relying on previous data assumptions (e.g. unfiltered datasets, synchronous settlement) will process incorrect domain logic.")

        if not reasoning_parts:
            return "No breaking contract alterations or behavioral changes were detected for this endpoint.", "Existing API clients can continue operating without code changes."

        return " ".join(reasoning_parts), " ".join(consumer_parts)

    def _calculate_confidence(
        self,
        structural: List[StructuralChangeRecord],
        semantic: List[SemanticFinding],
        behavioral: List[BehavioralFinding]
    ) -> float:
        # Deterministic structural changes have 0.95 confidence
        # Heuristic/NLP changes have 0.80 - 0.90 confidence
        if structural and not semantic and not behavioral:
            return 0.95
        if structural and (semantic or behavioral):
            return 0.92
        if semantic or behavioral:
            sims = [s.similarity_score for s in semantic]
            avg_sim = sum(sims) / len(sims) if sims else 0.70
            # Higher confidence if extreme similarity or extreme divergence
            return round(min(0.95, max(0.65, abs(avg_sim - 0.70) * 0.5 + 0.80)), 2)
        return 0.90
