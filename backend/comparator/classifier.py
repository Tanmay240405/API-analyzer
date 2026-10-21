from typing import Dict, Any, List, Tuple, Optional
from backend.models.schemas import EndpointChange, BehavioralDifference, BehavioralContract
from backend.comparator.structural_diff import StructuralComparator
from backend.nlp.behavioral_diff import BehavioralComparator
from backend.comparator.migration_generator import MigrationAdviceGenerator

class APIChangeClassifier:
    """
    Synthesizes structural and NLP behavioral analysis.
    Classifies changes into breaking categories, assigns severity,
    calculates holistic risk score, and attaches migration guidance.
    """
    def __init__(self):
        self.structural_diff = StructuralComparator()
        self.behavioral_diff = BehavioralComparator()
        self.migration_gen = MigrationAdviceGenerator()

    def classify_endpoint(
        self,
        path: str,
        method: str,
        change_type: str,
        v1_ep: Optional[Dict[str, Any]] = None,
        v2_ep: Optional[Dict[str, Any]] = None,
        v1_contract: Optional[BehavioralContract] = None,
        v2_contract: Optional[BehavioralContract] = None
    ) -> EndpointChange:
        method = method.upper()

        # Case 1: Endpoint Removed
        if change_type == "REMOVED":
            impact_info = self.migration_gen.generate_impact_and_migration(
                method, path, "REMOVED", True, "STRUCTURAL_BREAKING", [], [], v1_ep, None
            )
            return EndpointChange(
                path=path,
                method=method,
                change_type="REMOVED",
                is_breaking=True,
                breaking_type="STRUCTURAL_BREAKING",
                severity="CRITICAL",
                confidence_score=1.0,
                v1_summary=v1_ep.get("summary") if v1_ep else None,
                v1_description=v1_ep.get("description") if v1_ep else None,
                structural_changes=["Endpoint was completely removed from the API specification."],
                consumer_impact=impact_info["consumer_impact"],
                migration_recommendation=impact_info["migration_recommendation"],
                code_migration=impact_info["code_migration"]
            )

        # Case 2: Endpoint Added
        if change_type == "ADDED":
            impact_info = self.migration_gen.generate_impact_and_migration(
                method, path, "ADDED", False, "NON_BREAKING", [], [], None, v2_ep
            )
            return EndpointChange(
                path=path,
                method=method,
                change_type="ADDED",
                is_breaking=False,
                breaking_type="NON_BREAKING",
                severity="INFO",
                confidence_score=1.0,
                v2_summary=v2_ep.get("summary") if v2_ep else None,
                v2_description=v2_ep.get("description") if v2_ep else None,
                structural_changes=["New endpoint added in v2."],
                consumer_impact=impact_info["consumer_impact"],
                migration_recommendation=impact_info["migration_recommendation"],
                code_migration=impact_info["code_migration"]
            )

        # Case 3: Endpoint Modified or Unchanged
        # Run Structural Diff
        struct_changes, is_struct_breaking, breaking_reasons = self.structural_diff.compare_endpoints(v1_ep, v2_ep)

        # Run NLP Behavioral Diff
        v1_sum = v1_ep.get("summary", "")
        v1_desc = v1_ep.get("description", "")
        v2_sum = v2_ep.get("summary", "")
        v2_desc = v2_ep.get("description", "")

        sim, drift, behav_diffs, is_behav_breaking = self.behavioral_diff.compare_behaviors(
            v1_sum, v1_desc, v2_sum, v2_desc,
            v1_contract or BehavioralContract(),
            v2_contract or BehavioralContract()
        )

        # Determine overall breaking status and classification
        is_breaking = is_struct_breaking or is_behav_breaking
        if is_struct_breaking and is_behav_breaking:
            breaking_type = "DUAL_BREAKING"
        elif is_struct_breaking:
            breaking_type = "STRUCTURAL_BREAKING"
        elif is_behav_breaking:
            breaking_type = "BEHAVIORAL_BREAKING"
        else:
            breaking_type = "NON_BREAKING"

        # Determine Severity
        severity = "INFO"
        if is_breaking:
            has_critical = any(b.severity == "CRITICAL" for b in behav_diffs) or any("removed" in r.lower() for r in breaking_reasons)
            if has_critical:
                severity = "CRITICAL"
            else:
                severity = "HIGH"
        elif drift > 0.20 or any(b.severity in ["MEDIUM", "HIGH"] for b in behav_diffs):
            severity = "MEDIUM"
        elif struct_changes:
            severity = "LOW"
        else:
            severity = "INFO"

        # Confidence calculation based on agreement
        confidence = 0.95 if is_struct_breaking else (0.85 if is_behav_breaking else 0.90)

        # Generate Actionable Migration & Impact
        final_change_type = "MODIFIED" if (struct_changes or behav_diffs or drift > 0.05) else "UNCHANGED"
        impact_info = self.migration_gen.generate_impact_and_migration(
            method, path, final_change_type, is_breaking, breaking_type,
            struct_changes, behav_diffs, v1_ep, v2_ep
        )

        return EndpointChange(
            path=path,
            method=method,
            change_type=final_change_type,
            is_breaking=is_breaking,
            breaking_type=breaking_type,
            severity=severity,
            confidence_score=confidence,
            v1_summary=v1_sum,
            v2_summary=v2_sum,
            v1_description=v1_desc,
            v2_description=v2_desc,
            semantic_similarity=round(sim, 3),
            semantic_drift=round(drift, 3),
            structural_changes=struct_changes,
            v1_contracts=v1_contract,
            v2_contracts=v2_contract,
            behavioral_changes=behav_diffs,
            consumer_impact=impact_info["consumer_impact"],
            migration_recommendation=impact_info["migration_recommendation"],
            code_migration=impact_info["code_migration"]
        )

    def calculate_risk_score(self, endpoints: List[EndpointChange]) -> float:
        """
        Calculates holistic API breaking risk score on a 0 - 100 scale.
        """
        if not endpoints:
            return 0.0

        weights = {
            "CRITICAL": 30.0,
            "HIGH": 20.0,
            "MEDIUM": 8.0,
            "LOW": 3.0,
            "INFO": 0.0
        }

        total_risk = 0.0
        for ep in endpoints:
            total_risk += weights.get(ep.severity, 0.0)

        max_possible = len(endpoints) * weights["CRITICAL"]
        if max_possible == 0:
            return 0.0

        score = (total_risk / max_possible) * 100.0
        # Boost if multiple breaking changes exist
        breaking_count = sum(1 for ep in endpoints if ep.is_breaking)
        if breaking_count > 0:
            score = max(score, min(100.0, (breaking_count / len(endpoints)) * 100.0))

        return round(min(100.0, max(0.0, score)), 1)
