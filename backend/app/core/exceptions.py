from typing import Optional, Dict, Any

class APIAnalysisException(Exception):
    """Base exception for all API analysis errors."""
    def __init__(self, message: str, status_code: int = 400, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details or {}

class SpecificationParseError(APIAnalysisException):
    """Raised when an OpenAPI/Swagger spec cannot be parsed or validated."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, status_code=422, details=details)

class SemanticAnalysisError(APIAnalysisException):
    """Raised when the semantic analysis engine fails."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, status_code=500, details=details)

class AnalysisNotFoundError(APIAnalysisException):
    """Raised when a requested analysis ID does not exist."""
    def __init__(self, analysis_id: str):
        super().__init__(message=f"Analysis '{analysis_id}' not found.", status_code=404)
