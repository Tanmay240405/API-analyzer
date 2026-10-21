import pytest
from backend.app.services.specification_parser import SpecificationParser
from backend.app.core.exceptions import SpecificationParseError

SAMPLE_SPEC_YAML = """
openapi: 3.0.1
info:
  title: Users Service
  version: "1.2.0"
paths:
  /users:
    get:
      summary: List users
      description: Returns active user profiles.
      parameters:
        - name: limit
          in: query
          required: false
          schema:
            type: integer
            default: 20
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/User'
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
      required:
        - id
"""

def test_parser_loads_openapi3():
    parser = SpecificationParser()
    spec = parser.parse(SAMPLE_SPEC_YAML, "users.yaml")

    assert spec.title == "Users Service"
    assert spec.version == "1.2.0"
    assert len(spec.endpoints) == 1

    ep = spec.endpoints[0]
    assert ep.method == "GET"
    assert ep.path == "/users"
    assert len(ep.parameters) == 1
    assert ep.parameters[0].name == "limit"
    assert ep.parameters[0].default == 20
    assert "200" in ep.responses

def test_parser_resolves_local_refs():
    parser = SpecificationParser()
    spec = parser.parse(SAMPLE_SPEC_YAML, "users.yaml")
    ep = spec.endpoints[0]
    schema = ep.responses["200"].schema_definition
    assert schema is not None
    assert schema.get("type") == "array"
    # Resolved items
    items = schema.get("items", {})
    assert items.get("type") == "object"
    assert "id" in items.get("properties", {})

def test_parser_rejects_empty_content():
    parser = SpecificationParser()
    with pytest.raises(SpecificationParseError):
        parser.parse("", "empty.yaml")

def test_parser_rejects_malformed_yaml():
    parser = SpecificationParser()
    with pytest.raises(SpecificationParseError):
        parser.parse("openapi: 3.0\npaths: [unclosed", "bad.yaml")
