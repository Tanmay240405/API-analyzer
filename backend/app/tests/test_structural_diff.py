import pytest
from backend.app.services.specification_parser import SpecificationParser
from backend.app.nlp.structural_diff import StructuralDiffEngine
from backend.app.schemas.change import ChangeClassification, StructuralChangeType

SPEC_V1 = """
openapi: 3.0.0
info:
  title: Store API
  version: "1.0.0"
paths:
  /items:
    get:
      parameters:
        - name: filter
          in: query
          required: false
          schema:
            type: string
      responses:
        '200':
          description: Ok
  /obsolete:
    delete:
      responses:
        '204':
          description: Deleted
"""

SPEC_V2 = """
openapi: 3.0.0
info:
  title: Store API
  version: "2.0.0"
paths:
  /items:
    get:
      parameters:
        - name: filter
          in: query
          required: true
          schema:
            type: string
        - name: new_opt
          in: query
          required: false
          schema:
            type: integer
      responses:
        '200':
          description: Ok
        '201':
          description: Created
  /fresh:
    post:
      responses:
        '200':
          description: Ok
"""

def test_structural_diff_detects_all_major_categories():
    parser = SpecificationParser()
    s1 = parser.parse(SPEC_V1, "v1.yaml")
    s2 = parser.parse(SPEC_V2, "v2.yaml")

    engine = StructuralDiffEngine()
    changes = engine.compare(s1, s2)

    change_types = [c.change_type for c in changes]
    classifications = {c.change_type: c.preliminary_classification for c in changes}

    # Endpoint removed
    assert StructuralChangeType.ENDPOINT_REMOVED.value in change_types
    assert classifications[StructuralChangeType.ENDPOINT_REMOVED.value] == ChangeClassification.BREAKING

    # Endpoint added
    assert StructuralChangeType.ENDPOINT_ADDED.value in change_types
    assert classifications[StructuralChangeType.ENDPOINT_ADDED.value] == ChangeClassification.NON_BREAKING

    # Optional to Required
    assert StructuralChangeType.PARAMETER_REQUIRED_ADDED.value in change_types
    assert classifications[StructuralChangeType.PARAMETER_REQUIRED_ADDED.value] == ChangeClassification.BREAKING

    # Added optional parameter
    assert StructuralChangeType.PARAMETER_ADDED.value in change_types
    assert classifications[StructuralChangeType.PARAMETER_ADDED.value] == ChangeClassification.NON_BREAKING

    # Added response status code
    assert StructuralChangeType.RESPONSE_STATUS_ADDED.value in change_types
    assert classifications[StructuralChangeType.RESPONSE_STATUS_ADDED.value] == ChangeClassification.NON_BREAKING
