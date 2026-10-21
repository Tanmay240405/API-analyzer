from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, model_validator
from backend.app.schemas.change import (
    StructuralChangeRecord,
    SemanticFinding,
    BehavioralFinding,
    ImpactRecord,
    BehavioralContract
)

class ComparisonRequest(BaseModel):
    v1_content: str
    v2_content: str
    v1_filename: Optional[str] = "api_v1.yaml"
    v2_filename: Optional[str] = "api_v2.yaml"
    api_name: Optional[str] = None
    description: Optional[str] = None

class SemanticTestRequest(BaseModel):
    text_v1: str
    text_v2: str
    summary_v1: Optional[str] = ""
    summary_v2: Optional[str] = ""

class SemanticTestResponse(BaseModel):
    semantic_similarity: float
    semantic_drift: float
    is_breaking: bool
    v1_contracts: BehavioralContract
    v2_contracts: BehavioralContract
    behavioral_changes: List[Dict[str, Any]]
    explanation: str

# Unified Endpoint Change representation for the interactive dashboard tabs
class EndpointChange(BaseModel):
    path: str
    method: str
    change_type: str  # ADDED, REMOVED, MODIFIED, UNCHANGED
    is_breaking: bool
    breaking_type: str  # STRUCTURAL_BREAKING, BEHAVIORAL_BREAKING, DUAL_BREAKING, NON_BREAKING, UNCHANGED
    severity: str
    confidence_score: float
    v1_summary: Optional[str] = None
    v2_summary: Optional[str] = None
    v1_description: Optional[str] = None
    v2_description: Optional[str] = None
    semantic_similarity: Optional[float] = None
    semantic_drift: Optional[float] = None
    structural_changes: List[str] = Field(default_factory=list)
    v1_contracts: Optional[BehavioralContract] = None
    v2_contracts: Optional[BehavioralContract] = None
    behavioral_changes: List[Dict[str, Any]] = Field(default_factory=list)
    consumer_impact: str = ""
    migration_recommendation: str = ""
    code_migration: Optional[Dict[str, Any]] = None

class AnalysisMetadata(BaseModel):
    analysis_id: str
    created_at: str
    api_name: Optional[str] = None
    description: Optional[str] = None
    v1_title: str
    v1_version: str
    v1_filename: str
    v2_title: str
    v2_version: str
    v2_filename: str
    processing_duration_ms: float = 0.0
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    warnings: List[str] = Field(default_factory=list)

class AnalysisSummary(BaseModel):
    total_endpoints: int
    added_endpoints: int
    removed_endpoints: int
    modified_endpoints: int
    structural_changes_count: int
    semantic_drift_count: int
    behavioral_changes_count: int
    breaking_count: int
    potentially_breaking_count: int
    non_breaking_count: int
    needs_review_count: int
    overall_risk_score: float  # 0 to 100

class AnalysisResult(BaseModel):
    id: str
    created_at: str
    name: Optional[str] = None
    description: Optional[str] = None

    # Top-level flat compatibility fields for UI and API clients
    v1_filename: str = "api_v1.yaml"
    v2_filename: str = "api_v2.yaml"
    v1_title: str = "API v1"
    v2_title: str = "API v2"
    v1_version: str = "1.0.0"
    v2_version: str = "2.0.0"
    total_endpoints: int = 0
    total_changes: int = 0
    breaking_count: int = 0
    potentially_breaking_count: int = 0
    non_breaking_count: int = 0
    structural_breaking_count: int = 0
    behavioral_breaking_count: int = 0
    structural_changes_count: int = 0
    semantic_changes_count: int = 0
    risk_score: float = 0.0
    executive_summary: str = ""
    warnings: List[str] = Field(default_factory=list)
    category_breakdown: Dict[str, int] = Field(default_factory=lambda: {
        "DUAL_BREAKING": 0, "STRUCTURAL_BREAKING": 0, "BEHAVIORAL_BREAKING": 0, "NON_BREAKING": 0, "UNCHANGED": 0
    })
    severity_breakdown: Dict[str, int] = Field(default_factory=lambda: {
        "CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0
    })
    model_info: Dict[str, Any] = Field(default_factory=lambda: {
        "model_name": "sentence-transformers/all-MiniLM-L6-v2",
        "is_loaded": True,
        "backend": "PyTorch / sentence-transformers"
    })
    raw_v1: Optional[str] = None
    raw_v2: Optional[str] = None

    # Modular nested records
    metadata: AnalysisMetadata
    summary: AnalysisSummary
    structural_changes: List[StructuralChangeRecord] = Field(default_factory=list)
    semantic_findings: List[SemanticFinding] = Field(default_factory=list)
    behavioral_findings: List[BehavioralFinding] = Field(default_factory=list)
    impact_records: List[ImpactRecord] = Field(default_factory=list)
    endpoints: List[EndpointChange] = Field(default_factory=list)
    raw_v1_spec: Optional[Dict[str, Any]] = None
    raw_v2_spec: Optional[Dict[str, Any]] = None

    @model_validator(mode="before")
    @classmethod
    def populate_top_level_compat(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data

        meta = data.get("metadata") or {}
        if isinstance(meta, BaseModel):
            meta = meta.model_dump()
        summ = data.get("summary") or {}
        if isinstance(summ, BaseModel):
            summ = summ.model_dump()

        endpoints = data.get("endpoints") or []

        if not data.get("v1_filename") and meta:
            data["v1_filename"] = meta.get("v1_filename", "api_v1.yaml")
        if not data.get("v2_filename") and meta:
            data["v2_filename"] = meta.get("v2_filename", "api_v2.yaml")
        if not data.get("v1_title") and meta:
            data["v1_title"] = meta.get("v1_title", "API v1")
        if not data.get("v2_title") and meta:
            data["v2_title"] = meta.get("v2_title", "API v2")
        if not data.get("v1_version") and meta:
            data["v1_version"] = meta.get("v1_version", "1.0.0")
        if not data.get("v2_version") and meta:
            data["v2_version"] = meta.get("v2_version", "2.0.0")
        if not data.get("warnings") and meta:
            data["warnings"] = meta.get("warnings", [])

        if "total_endpoints" not in data or data["total_endpoints"] is None:
            data["total_endpoints"] = summ.get("total_endpoints", len(endpoints))
        if "breaking_count" not in data or data["breaking_count"] is None:
            data["breaking_count"] = summ.get("breaking_count", 0)
        if "potentially_breaking_count" not in data or data["potentially_breaking_count"] is None:
            data["potentially_breaking_count"] = summ.get("potentially_breaking_count", 0)
        if "non_breaking_count" not in data or data["non_breaking_count"] is None:
            data["non_breaking_count"] = summ.get("non_breaking_count", 0)
        if "structural_changes_count" not in data or data["structural_changes_count"] is None:
            data["structural_changes_count"] = summ.get("structural_changes_count", len(data.get("structural_changes") or []))
        if "semantic_changes_count" not in data or data["semantic_changes_count"] is None:
            data["semantic_changes_count"] = summ.get("semantic_drift_count", len(data.get("semantic_findings") or []))
        if "risk_score" not in data or data["risk_score"] is None:
            data["risk_score"] = summ.get("overall_risk_score", 0.0)

        # Compute breakdown dictionaries if missing or empty
        if not data.get("severity_breakdown"):
            sev = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0}
            for ep in endpoints:
                s = (ep.get("severity") if isinstance(ep, dict) else getattr(ep, "severity", "INFO")) or "INFO"
                sev[s.upper()] = sev.get(s.upper(), 0) + 1
            data["severity_breakdown"] = sev

        if not data.get("category_breakdown"):
            cat = {"DUAL_BREAKING": 0, "STRUCTURAL_BREAKING": 0, "BEHAVIORAL_BREAKING": 0, "NON_BREAKING": 0, "UNCHANGED": 0}
            for ep in endpoints:
                c = (ep.get("breaking_type") if isinstance(ep, dict) else getattr(ep, "breaking_type", "NON_BREAKING")) or "NON_BREAKING"
                cat[c.upper()] = cat.get(c.upper(), 0) + 1
            data["category_breakdown"] = cat

        if "structural_breaking_count" not in data or data["structural_breaking_count"] is None:
            data["structural_breaking_count"] = data["category_breakdown"].get("STRUCTURAL_BREAKING", 0) + data["category_breakdown"].get("DUAL_BREAKING", 0)
        if "behavioral_breaking_count" not in data or data["behavioral_breaking_count"] is None:
            data["behavioral_breaking_count"] = data["category_breakdown"].get("BEHAVIORAL_BREAKING", 0) + data["category_breakdown"].get("DUAL_BREAKING", 0)
        if "total_changes" not in data or data["total_changes"] is None:
            data["total_changes"] = data.get("structural_changes_count", 0) + data.get("semantic_changes_count", 0)

        if not data.get("executive_summary"):
            data["executive_summary"] = (
                f"Comparison of {data.get('v1_title')} (v{data.get('v1_version')}) to {data.get('v2_title')} (v{data.get('v2_version')}) "
                f"identified {data.get('breaking_count', 0)} breaking changes across {data.get('total_endpoints', 0)} operations. "
                f"Overall risk score: {data.get('risk_score', 0)}/100."
            )

        if not data.get("model_info"):
            model_name = meta.get("embedding_model", "sentence-transformers/all-MiniLM-L6-v2") if meta else "sentence-transformers/all-MiniLM-L6-v2"
            data["model_info"] = {
                "model_name": model_name,
                "is_loaded": True,
                "backend": "PyTorch / sentence-transformers"
            }

        return data

# History summary
class HistoryItemSummary(BaseModel):
    id: str
    created_at: str
    name: Optional[str] = None
    v1_title: str
    v2_title: str
    v1_version: str
    v2_version: str
    v1_filename: str
    v2_filename: str
    total_endpoints: int
    breaking_count: int
    potentially_breaking_count: int
    non_breaking_count: int
    status: str = "Completed"
    risk_score: float = 0.0

class DashboardStatsResponse(BaseModel):
    total_analyses: int
    total_structural_changes: int
    total_semantic_changes: int
    total_breaking_changes: int
    total_potentially_breaking: int
    total_non_breaking: int
    successful_analyses: int
    category_distribution: List[Dict[str, Any]]
    breaking_vs_non_breaking: List[Dict[str, Any]]
    recent_analyses: List[HistoryItemSummary]
