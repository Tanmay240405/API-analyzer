import json
import yaml
from typing import Dict, Any, List, Optional, Tuple

class OpenAPIParser:
    """
    Robust parser for OpenAPI 3.0, 3.1, and Swagger 2.0 specs in JSON or YAML.
    Normalizes endpoints, parameters, schemas, and documentation.
    """
    def __init__(self, content: str, filename: Optional[str] = None):
        self.raw_content = content
        self.filename = filename or "spec.yaml"
        self.spec = self._parse_raw(content)
        self.version = self._detect_version()
        self.title = str(self.spec.get("info", {}).get("title", "API Specification"))
        self.api_version = str(self.spec.get("info", {}).get("version", "1.0.0"))

    def _parse_raw(self, content: str) -> Dict[str, Any]:
        content_str = content.strip()
        if not content_str:
            raise ValueError("API specification content is empty.")
        
        # Try JSON first
        if content_str.startswith("{"):
            try:
                return json.loads(content_str)
            except Exception:
                pass

        # Try YAML
        try:
            parsed = yaml.safe_load(content_str)
            if isinstance(parsed, dict):
                return parsed
            raise ValueError("Parsed specification is not a valid JSON/YAML object.")
        except Exception as e:
            raise ValueError(f"Failed to parse specification as JSON or YAML: {e}")

    def _detect_version(self) -> str:
        if "openapi" in self.spec:
            return f"OpenAPI {self.spec['openapi']}"
        elif "swagger" in self.spec:
            return f"Swagger {self.spec['swagger']}"
        return "Unknown Specification"

    def resolve_ref(self, ref: str, max_depth: int = 10) -> Dict[str, Any]:
        """
        Resolves local $ref like '#/components/schemas/User' or '#/definitions/User'.
        """
        if not ref.startswith("#/"):
            return {}
        parts = ref.lstrip("#/").split("/")
        current = self.spec
        for part in parts:
            if isinstance(current, dict) and part in current:
                current = current[part]
            else:
                return {}
        return current if isinstance(current, dict) else {}

    def _flatten_schema(self, schema: Dict[str, Any], depth: int = 0) -> Dict[str, Any]:
        if depth > 8 or not isinstance(schema, dict):
            return schema

        if "$ref" in schema:
            resolved = self.resolve_ref(schema["$ref"])
            return self._flatten_schema(resolved, depth + 1)

        result = dict(schema)
        if "properties" in result and isinstance(result["properties"], dict):
            flat_props = {}
            for prop_name, prop_val in result["properties"].items():
                if isinstance(prop_val, dict):
                    flat_props[prop_name] = self._flatten_schema(prop_val, depth + 1)
                else:
                    flat_props[prop_name] = prop_val
            result["properties"] = flat_props

        if "items" in result and isinstance(result["items"], dict):
            result["items"] = self._flatten_schema(result["items"], depth + 1)

        return result

    def extract_endpoints(self) -> Dict[str, Dict[str, Any]]:
        """
        Extracts and normalizes all API operations.
        Key format: "{METHOD} {PATH}", e.g., "GET /users/{id}"
        """
        endpoints = {}
        paths = self.spec.get("paths", {})
        if not isinstance(paths, dict):
            return endpoints

        http_methods = {"get", "post", "put", "delete", "patch", "options", "head"}

        for path, path_item in paths.items():
            if not isinstance(path_item, dict):
                continue

            path_params = path_item.get("parameters", [])

            for key, operation in path_item.items():
                method = key.lower()
                if method not in http_methods or not isinstance(operation, dict):
                    continue

                endpoint_key = f"{method.upper()} {path}"
                summary = operation.get("summary", "")
                description = operation.get("description", "")
                operation_id = operation.get("operationId", "")
                deprecated = bool(operation.get("deprecated", False))

                # Merge path-level params with operation-level params
                raw_params = list(path_params) + list(operation.get("parameters", []))
                parameters = []
                for p in raw_params:
                    if "$ref" in p:
                        p = self.resolve_ref(p["$ref"])
                    if not isinstance(p, dict):
                        continue
                    schema = p.get("schema", {})
                    if "$ref" in schema:
                        schema = self.resolve_ref(schema["$ref"])
                    
                    param_type = schema.get("type", p.get("type", "any"))
                    parameters.append({
                        "name": p.get("name", ""),
                        "in": p.get("in", "query"),
                        "required": bool(p.get("required", False)),
                        "type": param_type,
                        "description": p.get("description", ""),
                        "enum": schema.get("enum", p.get("enum", [])),
                        "schema": self._flatten_schema(schema)
                    })

                # Request body (OpenAPI 3.x vs Swagger 2.x body param)
                request_body = {"required": False, "schemas": {}}
                if "requestBody" in operation and isinstance(operation["requestBody"], dict):
                    rb = operation["requestBody"]
                    if "$ref" in rb:
                        rb = self.resolve_ref(rb["$ref"])
                    request_body["required"] = bool(rb.get("required", False))
                    content = rb.get("content", {})
                    for media_type, media_info in content.items():
                        schema = media_info.get("schema", {})
                        request_body["schemas"][media_type] = self._flatten_schema(schema)
                else:
                    # Swagger 2.0 body param fallback
                    body_param = next((p for p in raw_params if isinstance(p, dict) and p.get("in") == "body"), None)
                    if body_param:
                        request_body["required"] = bool(body_param.get("required", False))
                        schema = body_param.get("schema", {})
                        request_body["schemas"]["application/json"] = self._flatten_schema(schema)

                # Responses
                responses = {}
                raw_responses = operation.get("responses", {})
                if isinstance(raw_responses, dict):
                    for code, resp in raw_responses.items():
                        if "$ref" in resp:
                            resp = self.resolve_ref(resp["$ref"])
                        if not isinstance(resp, dict):
                            continue
                        resp_desc = resp.get("description", "")
                        resp_schemas = {}
                        if "content" in resp and isinstance(resp["content"], dict):
                            for media_type, media_info in resp["content"].items():
                                schema = media_info.get("schema", {})
                                resp_schemas[media_type] = self._flatten_schema(schema)
                        elif "schema" in resp:
                            resp_schemas["application/json"] = self._flatten_schema(resp["schema"])
                        
                        responses[str(code)] = {
                            "description": resp_desc,
                            "schemas": resp_schemas
                        }

                endpoints[endpoint_key] = {
                    "path": path,
                    "method": method.upper(),
                    "summary": summary,
                    "description": description,
                    "operation_id": operation_id,
                    "deprecated": deprecated,
                    "parameters": parameters,
                    "request_body": request_body,
                    "responses": responses
                }

        return endpoints
