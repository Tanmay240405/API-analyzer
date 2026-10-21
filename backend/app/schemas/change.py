from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field

class ChangeClassification(str, Enum):
    BREAKING = "BREAKING"
    NON_BREAKING = "NON_BREAKING"
    POTENTIALLY_BREAKING = "POTENTIALLY_BREAKING"
    NEEDS_REVIEW = "NEEDS_REVIEW"

class ChangeSeverity(str, Enum):
    CRITICAL = "Critical"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"
    INFORMATIONAL = "Informational"

class StructuralChangeType(str, Enum):
    ENDPOINT_ADDED = "ENDPOINT_ADDED"
    ENDPOINT_REMOVED = "ENDPOINT_REMOVED"
    METHOD_ADDED = "METHOD_ADDED"
    METHOD_REMOVED = "METHOD_REMOVED"
    PARAMETER_ADDED = "PARAMETER_ADDED"
    PARAMETER_REMOVED = "PARAMETER_REMOVED"
    PARAMETER_REQUIRED_ADDED = "PARAMETER_REQUIRED_ADDED"
    PARAMETER_REQUIRED_REMOVED = "PARAMETER_REQUIRED_REMOVED"
    PARAMETER_TYPE_CHANGED = "PARAMETER_TYPE_CHANGED"
    PARAMETER_DEFAULT_CHANGED = "PARAMETER_DEFAULT_CHANGED"
    PARAMETER_ENUM_CHANGED = "PARAMETER_ENUM_CHANGED"
    REQUEST_BODY_SCHEMA_CHANGED = "REQUEST_BODY_SCHEMA_CHANGED"
    REQUEST_BODY_REQUIRED_CHANGED = "REQUEST_BODY_REQUIRED_CHANGED"
    RESPONSE_SCHEMA_CHANGED = "RESPONSE_SCHEMA_CHANGED"
    RESPONSE_STATUS_ADDED = "RESPONSE_STATUS_ADDED"
    RESPONSE_STATUS_REMOVED = "RESPONSE_STATUS_REMOVED"
    RESPONSE_CONTENT_TYPE_CHANGED = "RESPONSE_CONTENT_TYPE_CHANGED"
    SCHEMA_FIELD_ADDED = "SCHEMA_FIELD_ADDED"
    SCHEMA_FIELD_REMOVED = "SCHEMA_FIELD_REMOVED"

class StructuralChangeRecord(BaseModel):
    id: str
    endpoint_path: str
    http_method: str
    component_path: str
    change_type: str
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None
    severity: ChangeSeverity
    preliminary_classification: ChangeClassification
    explanation: str

class SemanticFinding(BaseModel):
    id: str
    endpoint_path: str
    http_method: str
    field_name: str
    old_text: Optional[str] = None
    new_text: Optional[str] = None
    similarity_score: float
    semantic_drift: float
    meaning_change_suspected: bool
    requires_review: bool
    confidence: Optional[float] = None
    explanation: str

class DeonticModalities(BaseModel):
    obligation: List[str] = Field(default_factory=list)
    prohibition: List[str] = Field(default_factory=list)
    permission: List[str] = Field(default_factory=list)

class BehavioralContract(BaseModel):
    modalities: DeonticModalities = Field(default_factory=DeonticModalities)
    preconditions: List[str] = Field(default_factory=list)
    postconditions: List[str] = Field(default_factory=list)
    rate_limits: List[str] = Field(default_factory=list)
    deprecations: List[str] = Field(default_factory=list)

class BehavioralFinding(BaseModel):
    id: str
    endpoint_path: str
    http_method: str
    category: str
    severity: ChangeSeverity
    classification: ChangeClassification
    observed_in_spec: bool
    evidence: str
    explanation: str
    requires_review: bool = False

class CodeSnippetMigration(BaseModel):
    language: str
    before_code: str
    after_code: str
    explanation: str

class ImpactRecord(BaseModel):
    id: str
    endpoint_path: str
    http_method: str
    classification: ChangeClassification
    severity: ChangeSeverity
    evidence: List[str] = Field(default_factory=list)
    reasoning: str
    affected_consumer_behavior: str
    confidence_score: float
    requires_manual_review: bool = False
    migration_guidance: str
    code_snippets: Dict[str, CodeSnippetMigration] = Field(default_factory=dict)
