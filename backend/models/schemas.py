from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class DeonticModality(BaseModel):
    obligation: List[str] = Field(default_factory=list) # must, shall, required
    prohibition: List[str] = Field(default_factory=list) # must not, cannot, forbidden
    permission: List[str] = Field(default_factory=list) # may, can, optional

class BehavioralContract(BaseModel):
    preconditions: List[str] = Field(default_factory=list)
    postconditions: List[str] = Field(default_factory=list)
    error_conditions: List[str] = Field(default_factory=list)
    rate_limits: List[str] = Field(default_factory=list)
    deprecation_notices: List[str] = Field(default_factory=list)
    constraints: List[str] = Field(default_factory=list)
    modalities: DeonticModality = Field(default_factory=DeonticModality)

class CodeMigration(BaseModel):
    language: str
    v1_snippet: str
    v2_snippet: str
    explanation: str

class BehavioralDifference(BaseModel):
    category: str # "precondition_tightened", "postcondition_altered", "rate_limit_reduced", "deprecation_added", "error_condition_changed", "semantic_drift"
    severity: str # "CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"
    is_breaking: bool
    v1_context: Optional[str] = None
    v2_context: Optional[str] = None
    explanation: str

class EndpointChange(BaseModel):
    path: str
    method: str
    change_type: str # "ADDED", "REMOVED", "MODIFIED", "UNCHANGED"
    is_breaking: bool
    breaking_type: str # "STRUCTURAL_BREAKING", "BEHAVIORAL_BREAKING", "DUAL_BREAKING", "NON_BREAKING", "UNCHANGED"
    severity: str # "CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"
    confidence_score: float # 0.0 to 1.0 (calibrated via rule-agreement)
    
    # NLP text & similarity
    v1_summary: Optional[str] = None
    v2_summary: Optional[str] = None
    v1_description: Optional[str] = None
    v2_description: Optional[str] = None
    semantic_similarity: Optional[float] = None # Cosine similarity (0 to 1)
    semantic_drift: Optional[float] = None # 1.0 - similarity
    
    # Structural details
    structural_changes: List[str] = Field(default_factory=list)
    
    # NLP Behavioral details
    v1_contracts: Optional[BehavioralContract] = None
    v2_contracts: Optional[BehavioralContract] = None
    behavioral_changes: List[BehavioralDifference] = Field(default_factory=list)
    
    # Impact & Remediation
    consumer_impact: str
    migration_recommendation: str
    code_migration: Optional[Dict[str, CodeMigration]] = None

class ComparisonRequest(BaseModel):
    v1_content: str
    v2_content: str
    v1_filename: Optional[str] = "api_v1.yaml"
    v2_filename: Optional[str] = "api_v2.yaml"
    api_name: Optional[str] = None
    description: Optional[str] = None
    format: Optional[str] = "auto"
    strictness: Optional[str] = "balanced" # "strict", "balanced", "permissive"

class ComparisonResponse(BaseModel):
    id: str
    created_at: str
    name: Optional[str] = None
    description: Optional[str] = None
    v1_filename: str = "api_v1.yaml"
    v2_filename: str = "api_v2.yaml"
    v1_title: str
    v2_title: str
    v1_version: str
    v2_version: str
    total_endpoints: int
    total_changes: int = 0
    breaking_count: int
    potentially_breaking_count: int = 0
    non_breaking_count: int
    structural_breaking_count: int
    behavioral_breaking_count: int
    structural_changes_count: int = 0
    semantic_changes_count: int = 0
    risk_score: float # 0.0 to 100.0
    executive_summary: str
    warnings: List[str] = Field(default_factory=list)
    endpoints: List[EndpointChange]
    category_breakdown: Dict[str, int]
    severity_breakdown: Dict[str, int]
    raw_v1: Optional[str] = None
    raw_v2: Optional[str] = None
    model_info: Dict[str, Any]

class HistoryItemSummary(BaseModel):
    id: str
    created_at: str
    name: Optional[str] = None
    v1_title: str
    v2_title: str
    v1_version: str
    v2_version: str
    v1_filename: Optional[str] = "api_v1.yaml"
    v2_filename: Optional[str] = "api_v2.yaml"
    total_endpoints: int
    breaking_count: int
    potentially_breaking_count: int = 0
    non_breaking_count: int = 0
    status: str = "Completed"
    risk_score: float

class ValidationRequest(BaseModel):
    content: str
    filename: Optional[str] = "spec.yaml"

class ValidationResponse(BaseModel):
    is_valid: bool
    title: str = ""
    version: str = ""
    spec_type: str = "Unknown"
    endpoints_count: int = 0
    endpoints: List[str] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)

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
    behavioral_changes: List[BehavioralDifference]
    explanation: str

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

class EvaluationItem(BaseModel):
    endpoint_name: str
    description_v1: str
    description_v2: str
    change_type: str
    ground_truth_breaking: bool
    predicted_breaking_nlp: bool
    predicted_breaking_structural_only: bool
    semantic_similarity: float
    detected_behavioral_reasons: List[str]

class EvaluationMetrics(BaseModel):
    total_cases: int
    nlp_enhanced: Dict[str, float] # precision, recall, f1, accuracy
    structural_only: Dict[str, float]
    confusion_matrix_nlp: Dict[str, int] # tp, fp, fn, tn
    confusion_matrix_structural: Dict[str, int]
    benchmark_dataset: List[EvaluationItem]
    scientific_conclusion: str
