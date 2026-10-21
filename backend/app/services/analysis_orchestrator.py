import time
import uuid
import datetime
from typing import Optional, List, Dict, Any, Tuple
from backend.app.schemas.specification import ParsedSpecification, EndpointDefinition
from backend.app.schemas.change import (
    StructuralChangeRecord,
    SemanticFinding,
    BehavioralFinding,
    ImpactRecord,
    ChangeClassification,
    ChangeSeverity,
    BehavioralContract
)
from backend.app.schemas.analysis import (
    ComparisonRequest,
    AnalysisResult,
    AnalysisMetadata,
    AnalysisSummary,
    EndpointChange
)
from backend.app.services.specification_parser import SpecificationParser
from backend.app.nlp.structural_diff import StructuralDiffEngine
from backend.app.nlp.semantic_analyzer import SemanticAnalyzer
from backend.app.nlp.behavioral_analyzer import BehavioralAnalyzer
from backend.app.nlp.impact_analyzer import ImpactAnalyzer
from backend.app.nlp.migration_recommender import MigrationRecommender
from backend.app.repositories.analysis_repository import analysis_repository

class AnalysisOrchestrator:
    """
    End-to-end orchestration pipeline coordinating parsing, structural diff,
    semantic NLP, behavioral contract extraction, impact classification, and migration guidance.
    """

    def __init__(self):
        self.parser = SpecificationParser()
        self.structural_engine = StructuralDiffEngine()
        self.semantic_analyzer = SemanticAnalyzer()
        self.behavioral_analyzer = BehavioralAnalyzer()
        self.impact_analyzer = ImpactAnalyzer()
        self.migration_recommender = MigrationRecommender()

    def run_full_analysis(self, req: ComparisonRequest) -> AnalysisResult:
        start_time = time.time()
        warnings: List[str] = []

        # 1. Parsing
        v1_spec = self.parser.parse(req.v1_content, req.v1_filename or "api_v1.yaml")
        v2_spec = self.parser.parse(req.v2_content, req.v2_filename or "api_v2.yaml")

        # 2. Structural Diff
        structural_changes = self.structural_engine.compare(v1_spec, v2_spec)

        # 3. Semantic Analysis
        try:
            semantic_findings = self.semantic_analyzer.analyze_endpoints(v1_spec, v2_spec)
        except Exception as e:
            warnings.append(f"Semantic analysis partial error: {e}")
            semantic_findings = []

        # 4. Group findings by endpoint & run Behavioral + Impact + Migration
        all_endpoint_keys = set(v1_spec.endpoint_map.keys()) | set(v2_spec.endpoint_map.keys())
        all_behavioral_findings: List[BehavioralFinding] = []
        all_impact_records: List[ImpactRecord] = []
        dashboard_endpoints: List[EndpointChange] = []

        breaking_count = 0
        pot_breaking_count = 0
        non_breaking_count = 0
        needs_review_count = 0

        for key in sorted(all_endpoint_keys):
            ep1 = v1_spec.endpoint_map.get(key)
            ep2 = v2_spec.endpoint_map.get(key)

            path = (ep2 or ep1).path
            method = (ep2 or ep1).method

            # Change Type
            if not ep1 and ep2:
                change_type = "ADDED"
            elif ep1 and not ep2:
                change_type = "REMOVED"
            else:
                change_type = "MODIFIED"

            # Filter relevant structural & semantic findings for this endpoint
            ep_structural = [s for s in structural_changes if s.endpoint_path == path and s.http_method == method]
            ep_semantic = [sem for sem in semantic_findings if sem.endpoint_path == path and sem.http_method == method]

            # Behavioral extraction
            ep_behavioral: List[BehavioralFinding] = []
            contract1 = None
            contract2 = None
            if ep1 and ep2:
                contract1, contract2, ep_behavioral = self.behavioral_analyzer.compare_endpoint_behavior(ep1, ep2)
                all_behavioral_findings.extend(ep_behavioral)

            # Impact assessment
            impact = self.impact_analyzer.assess_endpoint_impact(
                endpoint_path=path,
                http_method=method,
                structural_changes=ep_structural,
                semantic_findings=ep_semantic,
                behavioral_findings=ep_behavioral
            )

            # Migration recommendation & code snippets
            guidance, snippets = self.migration_recommender.generate_recommendations(
                endpoint_path=path,
                http_method=method,
                structural_changes=ep_structural,
                semantic_findings=ep_semantic,
                behavioral_findings=ep_behavioral
            )
            impact.migration_guidance = guidance
            impact.code_snippets = snippets
            all_impact_records.append(impact)

            # Aggregate stats
            if impact.classification == ChangeClassification.BREAKING:
                breaking_count += 1
            elif impact.classification == ChangeClassification.POTENTIALLY_BREAKING:
                pot_breaking_count += 1
            elif impact.classification == ChangeClassification.NEEDS_REVIEW:
                needs_review_count += 1
            else:
                non_breaking_count += 1

            # Determine composite breaking type for the dashboard
            has_struct_breaking = any(s.preliminary_classification == ChangeClassification.BREAKING for s in ep_structural)
            has_beh_breaking = any(b.classification == ChangeClassification.BREAKING for b in ep_behavioral) or any(sem.similarity_score < 0.60 for sem in ep_semantic)

            if has_struct_breaking and has_beh_breaking:
                breaking_type = "DUAL_BREAKING"
            elif has_struct_breaking:
                breaking_type = "STRUCTURAL_BREAKING"
            elif has_beh_breaking:
                breaking_type = "BEHAVIORAL_BREAKING"
            elif impact.classification == ChangeClassification.NON_BREAKING:
                breaking_type = "NON_BREAKING"
            else:
                breaking_type = "UNCHANGED" if not ep_structural and not ep_behavioral and not ep_semantic else "NON_BREAKING"

            sim_score = ep_semantic[0].similarity_score if ep_semantic else (1.0 if ep1 and ep2 else None)
            drift_score = ep_semantic[0].semantic_drift if ep_semantic else (0.0 if ep1 and ep2 else None)

            # Dashboard EndpointChange item
            dashboard_endpoints.append(
                EndpointChange(
                    path=path,
                    method=method,
                    change_type=change_type,
                    is_breaking=impact.classification == ChangeClassification.BREAKING,
                    breaking_type=breaking_type,
                    severity=impact.severity.value,
                    confidence_score=impact.confidence_score,
                    v1_summary=ep1.summary if ep1 else None,
                    v2_summary=ep2.summary if ep2 else None,
                    v1_description=ep1.description if ep1 else None,
                    v2_description=ep2.description if ep2 else None,
                    semantic_similarity=sim_score,
                    semantic_drift=drift_score,
                    structural_changes=[s.explanation for s in ep_structural],
                    v1_contracts=contract1,
                    v2_contracts=contract2,
                    behavioral_changes=[b.model_dump() for b in ep_behavioral],
                    consumer_impact=impact.affected_consumer_behavior,
                    migration_recommendation=guidance,
                    code_migration={k: v.model_dump() for k, v in snippets.items()}
                )
            )

        duration_ms = round((time.time() - start_time) * 1000, 2)
        total_ops = len(all_endpoint_keys)
        risk_score = round((breaking_count / max(1, total_ops)) * 100.0, 1)

        analysis_id = str(uuid.uuid4())
        created_at = datetime.datetime.now().isoformat()
        name = req.api_name or f"{v1_spec.title} (v{v1_spec.version} -> v{v2_spec.version})"

        metadata = AnalysisMetadata(
            analysis_id=analysis_id,
            created_at=created_at,
            api_name=req.api_name,
            description=req.description,
            v1_title=v1_spec.title,
            v1_version=v1_spec.version,
            v1_filename=req.v1_filename or "api_v1.yaml",
            v2_title=v2_spec.title,
            v2_version=v2_spec.version,
            v2_filename=req.v2_filename or "api_v2.yaml",
            processing_duration_ms=duration_ms,
            embedding_model=self.semantic_analyzer.model_name,
            warnings=warnings
        )

        summary = AnalysisSummary(
            total_endpoints=total_ops,
            added_endpoints=len([e for e in dashboard_endpoints if e.change_type == "ADDED"]),
            removed_endpoints=len([e for e in dashboard_endpoints if e.change_type == "REMOVED"]),
            modified_endpoints=len([e for e in dashboard_endpoints if e.change_type == "MODIFIED"]),
            structural_changes_count=len(structural_changes),
            semantic_drift_count=len(semantic_findings),
            behavioral_changes_count=len(all_behavioral_findings),
            breaking_count=breaking_count,
            potentially_breaking_count=pot_breaking_count,
            non_breaking_count=non_breaking_count,
            needs_review_count=needs_review_count,
            overall_risk_score=risk_score
        )

        result = AnalysisResult(
            id=analysis_id,
            created_at=created_at,
            name=name,
            description=req.description,
            metadata=metadata,
            summary=summary,
            structural_changes=structural_changes,
            semantic_findings=semantic_findings,
            behavioral_findings=all_behavioral_findings,
            impact_records=all_impact_records,
            endpoints=dashboard_endpoints,
            raw_v1_spec=v1_spec.raw_spec,
            raw_v2_spec=v2_spec.raw_spec,
            raw_v1=req.v1_content,
            raw_v2=req.v2_content
        )

        # 9. Persistence
        analysis_repository.save_analysis(result)

        return result

    # Independent execution of individual modules
    def run_structural_diff(self, v1_content: str, v2_content: str, v1_file: str = "v1.yaml", v2_file: str = "v2.yaml") -> List[StructuralChangeRecord]:
        v1_spec = self.parser.parse(v1_content, v1_file)
        v2_spec = self.parser.parse(v2_content, v2_file)
        return self.structural_engine.compare(v1_spec, v2_spec)

    def run_semantic_diff(self, text_v1: str, text_v2: str) -> Optional[SemanticFinding]:
        return self.semantic_analyzer.analyze_text_pair(
            endpoint_path="manual_sandbox",
            http_method="POST",
            field_name="documentation",
            old_text=text_v1,
            new_text=text_v2
        )

    def run_behavioral_diff(self, text_v1: str, text_v2: str) -> Tuple[BehavioralContract, BehavioralContract, List[BehavioralFinding]]:
        c1 = self.behavioral_analyzer.extract_contracts(text_v1)
        c2 = self.behavioral_analyzer.extract_contracts(text_v2)
        findings = self.behavioral_analyzer.compare_contracts("manual_sandbox", "POST", c1, c2)
        return c1, c2, findings

orchestrator = AnalysisOrchestrator()
