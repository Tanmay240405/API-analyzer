import json
import yaml
from typing import Dict, Any, List, Optional, Tuple
from backend.app.schemas.specification import (
    ParsedSpecification,
    EndpointDefinition,
    ParameterDefinition,
    ResponseDefinition
)
from backend.app.core.exceptions import SpecificationParseError

class SpecificationParser:
    """
    Robust OpenAPI 3.x and Swagger 2.0 parser.
    Supports JSON and YAML, handles recursive local $ref resolution, and normalizes components.
    """

    def parse(self, content: str, filename: str = "spec.yaml") -> ParsedSpecification:
        raw_dict = self._load_content(content, filename)
        resolved_spec = self._resolve_refs(raw_dict, raw_dict)

        info = resolved_spec.get("info", {})
        title = str(info.get("title", "Untitled API"))
        version = str(info.get("version", "1.0.0"))
        openapi_version = str(resolved_spec.get("openapi") or resolved_spec.get("swagger") or "3.0.0")
        description = info.get("description")

        endpoints: List[EndpointDefinition] = []
        endpoint_map: Dict[str, EndpointDefinition] = {}

        paths = resolved_spec.get("paths", {})
        if not isinstance(paths, dict):
            paths = {}

        http_methods = ["get", "post", "put", "delete", "patch", "options", "head"]

        for path_str, path_item in paths.items():
            if not isinstance(path_item, dict):
                continue

            # Shared path-level parameters
            path_level_params = path_item.get("parameters", [])

            for method_str, op_dict in path_item.items():
                method_lower = method_str.lower()
                if method_lower not in http_methods or not isinstance(op_dict, dict):
                    continue

                method_upper = method_lower.upper()

                # Merge parameters
                op_params = op_dict.get("parameters", [])
                all_params_raw = path_level_params + op_params
                parameters = self._extract_parameters(all_params_raw)

                # Request body
                req_body_schema, req_body_required = self._extract_request_body(op_dict, resolved_spec)

                # Responses
                responses = self._extract_responses(op_dict.get("responses", {}))

                ep = EndpointDefinition(
                    path=path_str,
                    method=method_upper,
                    summary=op_dict.get("summary"),
                    description=op_dict.get("description"),
                    operation_id=op_dict.get("operationId"),
                    parameters=parameters,
                    request_body_schema=req_body_schema,
                    request_body_required=req_body_required,
                    responses=responses,
                    tags=op_dict.get("tags", []),
                    deprecated=bool(op_dict.get("deprecated", False))
                )

                key = f"{method_upper} {path_str}"
                endpoints.append(ep)
                endpoint_map[key] = ep

        return ParsedSpecification(
            title=title,
            version=version,
            openapi_version=openapi_version,
            description=description,
            endpoints=endpoints,
            endpoint_map=endpoint_map,
            raw_spec=resolved_spec
        )

    def _load_content(self, content: str, filename: str) -> Dict[str, Any]:
        if not content or not content.strip():
            raise SpecificationParseError("Specification content is empty.")

        content_clean = content.strip()
        # Try JSON
        if content_clean.startswith("{") or filename.endswith(".json"):
            try:
                return json.loads(content_clean)
            except json.JSONDecodeError as e:
                # If it had json extension, fail with specific error; else fallback to yaml
                if filename.endswith(".json"):
                    raise SpecificationParseError(f"Invalid JSON specification: {e}")

        # Try YAML
        try:
            parsed = yaml.safe_load(content_clean)
            if not isinstance(parsed, dict):
                raise SpecificationParseError("Specification root must be a YAML/JSON dictionary/mapping.")
            return parsed
        except yaml.YAMLError as e:
            raise SpecificationParseError(f"Invalid YAML specification: {e}")

    def _resolve_refs(self, node: Any, root: Dict[str, Any], depth: int = 0) -> Any:
        if depth > 20:
            return node

        if isinstance(node, dict):
            if "$ref" in node and isinstance(node["$ref"], str):
                ref_path = node["$ref"]
                if ref_path.startswith("#/"):
                    parts = ref_path.lstrip("#/").split("/")
                    curr = root
                    found = True
                    for part in parts:
                        part = part.replace("~1", "/").replace("~0", "~")
                        if isinstance(curr, dict) and part in curr:
                            curr = curr[part]
                        else:
                            found = False
                            break
                    if found:
                        merged = {k: v for k, v in node.items() if k != "$ref"}
                        resolved_target = self._resolve_refs(curr, root, depth + 1)
                        if isinstance(resolved_target, dict):
                            merged = {**resolved_target, **merged}
                            return merged
                        return resolved_target

            return {k: self._resolve_refs(v, root, depth + 1) for k, v in node.items()}

        elif isinstance(node, list):
            return [self._resolve_refs(item, root, depth + 1) for item in node]

        return node

    def _extract_parameters(self, raw_params: List[Any]) -> List[ParameterDefinition]:
        params: List[ParameterDefinition] = []
        for p in raw_params:
            if not isinstance(p, dict):
                continue
            name = p.get("name")
            in_loc = p.get("in", "query")
            if not name:
                continue

            schema = p.get("schema", {})
            schema_type = schema.get("type") if isinstance(schema, dict) else p.get("type")
            default_val = schema.get("default") if isinstance(schema, dict) else p.get("default")
            enum_vals = schema.get("enum") if isinstance(schema, dict) else p.get("enum")

            params.append(
                ParameterDefinition(
                    name=name,
                    in_location=in_loc,
                    required=bool(p.get("required", False)),
                    description=p.get("description"),
                    schema_type=schema_type,
                    default=default_val,
                    enum_values=enum_vals
                )
            )
        return params

    def _extract_request_body(self, op_dict: Dict[str, Any], root: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], bool]:
        # OpenAPI 3.x requestBody
        req_body = op_dict.get("requestBody")
        if isinstance(req_body, dict):
            content = req_body.get("content", {})
            required = bool(req_body.get("required", False))
            for ct in ["application/json", "application/x-www-form-urlencoded", "multipart/form-data"]:
                if ct in content and "schema" in content[ct]:
                    return content[ct]["schema"], required
            if content:
                first_ct = next(iter(content.values()))
                if isinstance(first_ct, dict) and "schema" in first_ct:
                    return first_ct["schema"], required
            return None, required

        # Swagger 2.0 body parameter
        for p in op_dict.get("parameters", []):
            if isinstance(p, dict) and p.get("in") == "body":
                return p.get("schema"), bool(p.get("required", False))

        return None, False

    def _extract_responses(self, responses_dict: Dict[str, Any]) -> Dict[str, ResponseDefinition]:
        result: Dict[str, ResponseDefinition] = {}
        if not isinstance(responses_dict, dict):
            return result

        for status_code, r_dict in responses_dict.items():
            if not isinstance(r_dict, dict):
                continue

            content_types: List[str] = []
            schema_def: Optional[Dict[str, Any]] = None

            # OpenAPI 3.x
            if "content" in r_dict and isinstance(r_dict["content"], dict):
                content_types = list(r_dict["content"].keys())
                for ct in ["application/json", "text/plain", "*/*"]:
                    if ct in r_dict["content"] and "schema" in r_dict["content"][ct]:
                        schema_def = r_dict["content"][ct]["schema"]
                        break
                if not schema_def and content_types:
                    first = r_dict["content"][content_types[0]]
                    if isinstance(first, dict):
                        schema_def = first.get("schema")

            # Swagger 2.0
            elif "schema" in r_dict:
                schema_def = r_dict["schema"]
                content_types = ["application/json"]

            result[str(status_code)] = ResponseDefinition(
                status_code=str(status_code),
                description=r_dict.get("description"),
                content_types=content_types,
                schema_definition=schema_def
            )

        return result
