from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from backend.app.schemas.analysis import (
    ComparisonRequest,
    AnalysisResult,
    HistoryItemSummary,
    DashboardStatsResponse,
    SemanticTestRequest,
    SemanticTestResponse
)
from backend.app.schemas.change import (
    StructuralChangeRecord,
    SemanticFinding
)
from backend.app.services.analysis_orchestrator import orchestrator
from backend.app.repositories.analysis_repository import analysis_repository

router = APIRouter(tags=["Analyses"])

@router.post("/analyses/full", response_model=AnalysisResult)
@router.post("/compare", response_model=AnalysisResult)
def run_full_analysis(req: ComparisonRequest):
    try:
        return orchestrator.run_full_analysis(req)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/analyses/structural", response_model=List[StructuralChangeRecord])
def run_structural_analysis(req: ComparisonRequest):
    try:
        return orchestrator.run_structural_diff(
            req.v1_content,
            req.v2_content,
            req.v1_filename or "v1.yaml",
            req.v2_filename or "v2.yaml"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/analyses/semantic")
def run_semantic_analysis(req: SemanticTestRequest):
    finding = orchestrator.run_semantic_diff(req.text_v1, req.text_v2)
    return finding or {"message": "Texts are identical or exhibit negligible semantic difference."}

@router.post("/analyses/behavioral")
def run_behavioral_analysis(req: SemanticTestRequest):
    c1, c2, findings = orchestrator.run_behavioral_diff(req.text_v1, req.text_v2)
    return {
        "v1_contracts": c1,
        "v2_contracts": c2,
        "findings": findings
    }

@router.post("/semantic-test", response_model=SemanticTestResponse)
def test_semantic_endpoint(req: SemanticTestRequest):
    t1 = f"{req.summary_v1 or ''} {req.text_v1}".strip()
    t2 = f"{req.summary_v2 or ''} {req.text_v2}".strip()

    c1, c2, findings = orchestrator.run_behavioral_diff(t1, t2)
    sem_finding = orchestrator.run_semantic_diff(t1, t2)

    sim = sem_finding.similarity_score if sem_finding else 1.0
    drift = sem_finding.semantic_drift if sem_finding else 0.0

    is_breaking = any(b.classification.value == "BREAKING" for b in findings) or (sim < 0.65) or (sem_finding is not None and sem_finding.meaning_change_suspected)
    explanation = sem_finding.explanation if sem_finding else (
        "No significant semantic drift or behavioral contradiction detected."
    )

    return SemanticTestResponse(
        semantic_similarity=sim,
        semantic_drift=drift,
        is_breaking=is_breaking,
        v1_contracts=c1,
        v2_contracts=c2,
        behavioral_changes=[b.model_dump() for b in findings],
        explanation=explanation
    )

@router.get("/analyses", response_model=List[HistoryItemSummary])
@router.get("/history", response_model=List[HistoryItemSummary])
def get_analyses_history(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    return analysis_repository.list_analyses(limit=limit, offset=offset)

@router.get("/analyses/{analysis_id}", response_model=AnalysisResult)
@router.get("/history/{analysis_id}", response_model=AnalysisResult)
def get_analysis_by_id(analysis_id: str):
    result = analysis_repository.get_analysis(analysis_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Analysis '{analysis_id}' not found.")
    return result

@router.delete("/analyses/{analysis_id}")
@router.delete("/history/{analysis_id}")
def delete_analysis(analysis_id: str):
    deleted = analysis_repository.delete_analysis(analysis_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Analysis '{analysis_id}' not found.")
    return {"message": f"Analysis '{analysis_id}' deleted successfully.", "deleted": True}

@router.get("/dashboard/stats", response_model=DashboardStatsResponse)
def get_dashboard_statistics():
    return analysis_repository.get_dashboard_stats()
