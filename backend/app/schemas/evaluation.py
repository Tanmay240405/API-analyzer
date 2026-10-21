from typing import List, Dict, Optional
from pydantic import BaseModel, Field

class EvaluationCase(BaseModel):
    id: str
    endpoint_name: str
    description_v1: str
    description_v2: str
    change_type: str  # structural, semantic, behavioral, ambiguous
    ground_truth_breaking: bool
    is_synthetic: bool = True
    domain: Optional[str] = "payment"
    documentation_note: Optional[str] = None

class EvaluationItemResult(BaseModel):
    endpoint_name: str
    description_v1: str
    description_v2: str
    change_type: str
    ground_truth_breaking: bool
    predicted_breaking_nlp: bool
    predicted_breaking_structural_only: bool
    semantic_similarity: float
    detected_behavioral_reasons: List[str] = Field(default_factory=list)

class SystemMetricScores(BaseModel):
    precision: float
    recall: float
    f1_score: float
    accuracy: float

class ConfusionMatrix(BaseModel):
    tp: int
    fp: int
    tn: int
    fn: int

class EvaluationMetrics(BaseModel):
    total_cases: int
    nlp_enhanced: SystemMetricScores
    structural_only: SystemMetricScores
    confusion_matrix_nlp: ConfusionMatrix
    confusion_matrix_structural: ConfusionMatrix
    category_breakdown: Dict[str, Dict[str, float]] = Field(default_factory=dict)
    detailed_cases: List[EvaluationItemResult] = Field(default_factory=list)
    dataset_metadata: Dict[str, str] = Field(default_factory=dict)
