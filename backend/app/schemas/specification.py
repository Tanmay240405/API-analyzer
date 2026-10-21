from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class ParameterDefinition(BaseModel):
    name: str
    in_location: str = Field(..., alias="in")
    required: bool = False
    description: Optional[str] = None
    schema_type: Optional[str] = None
    default: Optional[Any] = None
    enum_values: Optional[List[Any]] = None

    model_config = {"populate_by_name": True}

class ResponseDefinition(BaseModel):
    status_code: str
    description: Optional[str] = None
    content_types: List[str] = Field(default_factory=list)
    schema_definition: Optional[Dict[str, Any]] = None

class EndpointDefinition(BaseModel):
    path: str
    method: str
    summary: Optional[str] = None
    description: Optional[str] = None
    operation_id: Optional[str] = None
    parameters: List[ParameterDefinition] = Field(default_factory=list)
    request_body_schema: Optional[Dict[str, Any]] = None
    request_body_required: bool = False
    responses: Dict[str, ResponseDefinition] = Field(default_factory=dict)
    tags: List[str] = Field(default_factory=list)
    deprecated: bool = False

class ParsedSpecification(BaseModel):
    title: str = "Unknown API"
    version: str = "1.0.0"
    openapi_version: str = "3.0.0"
    description: Optional[str] = None
    endpoints: List[EndpointDefinition] = Field(default_factory=list)
    endpoint_map: Dict[str, EndpointDefinition] = Field(default_factory=dict)
    raw_spec: Dict[str, Any] = Field(default_factory=dict)

class ValidationRequest(BaseModel):
    content: str
    filename: Optional[str] = "openapi.yaml"

class ValidationResponse(BaseModel):
    is_valid: bool
    title: Optional[str] = None
    version: Optional[str] = None
    openapi_version: Optional[str] = None
    endpoint_count: int = 0
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
