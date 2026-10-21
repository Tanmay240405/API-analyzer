import uuid
from typing import List, Dict, Any, Optional, Set
from backend.app.schemas.specification import (
    ParsedSpecification,
    EndpointDefinition,
    ParameterDefinition,
    ResponseDefinition
)
from backend.app.schemas.change import (
    StructuralChangeRecord,
    StructuralChangeType,
    ChangeSeverity,
    ChangeClassification
)

class StructuralDiffEngine:
    """
    Deterministic structural comparison engine analyzing OpenAPI / Swagger specifications.
    Detects added/removed endpoints, methods, parameters, types, schemas, status codes, and constraints.
    """

    def compare(
        self,
        v1_spec: ParsedSpecification,
        v2_spec: ParsedSpecification
    ) -> List[StructuralChangeRecord]:
        changes: List[StructuralChangeRecord] = []

        v1_map = v1_spec.endpoint_map
        v2_map = v2_spec.endpoint_map

        v1_keys: Set[str] = set(v1_map.keys())
        v2_keys: Set[str] = set(v2_map.keys())

        # 1. Removed endpoints / operations
        for key in v1_keys - v2_keys:
            ep = v1_map[key]
            changes.append(
                StructuralChangeRecord(
                    id=f"struct-{uuid.uuid4().hex[:8]}",
                    endpoint_path=ep.path,
                    http_method=ep.method,
                    component_path=f"paths['{ep.path}']['{ep.method.lower()}']",
                    change_type=StructuralChangeType.ENDPOINT_REMOVED.value,
                    old_value=f"{ep.method} {ep.path}",
                    new_value=None,
                    severity=ChangeSeverity.CRITICAL,
                    preliminary_classification=ChangeClassification.BREAKING,
                    explanation=f"Endpoint operation '{ep.method} {ep.path}' was removed from the API specification."
                )
            )

        # 2. Added endpoints / operations
        for key in v2_keys - v1_keys:
            ep = v2_map[key]
            changes.append(
                StructuralChangeRecord(
                    id=f"struct-{uuid.uuid4().hex[:8]}",
                    endpoint_path=ep.path,
                    http_method=ep.method,
                    component_path=f"paths['{ep.path}']['{ep.method.lower()}']",
                    change_type=StructuralChangeType.ENDPOINT_ADDED.value,
                    old_value=None,
                    new_value=f"{ep.method} {ep.path}",
                    severity=ChangeSeverity.INFORMATIONAL,
                    preliminary_classification=ChangeClassification.NON_BREAKING,
                    explanation=f"New endpoint operation '{ep.method} {ep.path}' was added to the specification."
                )
            )

        # 3. Modified endpoints
        for key in v1_keys & v2_keys:
            ep1 = v1_map[key]
            ep2 = v2_map[key]
            changes.extend(self._compare_endpoint(ep1, ep2))

        return changes

    def _compare_endpoint(
        self,
        ep1: EndpointDefinition,
        ep2: EndpointDefinition
    ) -> List[StructuralChangeRecord]:
        diffs: List[StructuralChangeRecord] = []
        path = ep1.path
        method = ep1.method

        # A. Compare Parameters
        p1_map = {f"{p.in_location}:{p.name}": p for p in ep1.parameters}
        p2_map = {f"{p.in_location}:{p.name}": p for p in ep2.parameters}

        # Removed parameters
        for p_key, p1 in p1_map.items():
            if p_key not in p2_map:
                diffs.append(
                    StructuralChangeRecord(
                        id=f"struct-{uuid.uuid4().hex[:8]}",
                        endpoint_path=path,
                        http_method=method,
                        component_path=f"paths['{path}']['{method.lower()}'].parameters['{p1.name}']",
                        change_type=StructuralChangeType.PARAMETER_REMOVED.value,
                        old_value=p1.name,
                        new_value=None,
                        severity=ChangeSeverity.MEDIUM,
                        preliminary_classification=ChangeClassification.POTENTIALLY_BREAKING,
                        explanation=f"Parameter '{p1.name}' ({p1.in_location}) was removed."
                    )
                )

        # Added parameters
        for p_key, p2 in p2_map.items():
            if p_key not in p1_map:
                if p2.required:
                    diffs.append(
                        StructuralChangeRecord(
                            id=f"struct-{uuid.uuid4().hex[:8]}",
                            endpoint_path=path,
                            http_method=method,
                            component_path=f"paths['{path}']['{method.lower()}'].parameters['{p2.name}']",
                            change_type=StructuralChangeType.PARAMETER_REQUIRED_ADDED.value,
                            old_value=None,
                            new_value=p2.name,
                            severity=ChangeSeverity.HIGH,
                            preliminary_classification=ChangeClassification.BREAKING,
                            explanation=f"New REQUIRED parameter '{p2.name}' ({p2.in_location}) was introduced."
                        )
                    )
                else:
                    diffs.append(
                        StructuralChangeRecord(
                            id=f"struct-{uuid.uuid4().hex[:8]}",
                            endpoint_path=path,
                            http_method=method,
                            component_path=f"paths['{path}']['{method.lower()}'].parameters['{p2.name}']",
                            change_type=StructuralChangeType.PARAMETER_ADDED.value,
                            old_value=None,
                            new_value=p2.name,
                            severity=ChangeSeverity.LOW,
                            preliminary_classification=ChangeClassification.NON_BREAKING,
                            explanation=f"New optional parameter '{p2.name}' ({p2.in_location}) was added."
                        )
                    )

        # Modified common parameters
        for p_key in set(p1_map.keys()) & set(p2_map.keys()):
            p1 = p1_map[p_key]
            p2 = p2_map[p_key]

            # Optional -> Required
            if not p1.required and p2.required:
                diffs.append(
                    StructuralChangeRecord(
                        id=f"struct-{uuid.uuid4().hex[:8]}",
                        endpoint_path=path,
                        http_method=method,
                        component_path=f"paths['{path}']['{method.lower()}'].parameters['{p1.name}'].required",
                        change_type=StructuralChangeType.PARAMETER_REQUIRED_ADDED.value,
                        old_value="optional",
                        new_value="required",
                        severity=ChangeSeverity.HIGH,
                        preliminary_classification=ChangeClassification.BREAKING,
                        explanation=f"Parameter '{p1.name}' ({p1.in_location}) changed from optional to REQUIRED."
                    )
                )
            # Required -> Optional
            elif p1.required and not p2.required:
                diffs.append(
                    StructuralChangeRecord(
                        id=f"struct-{uuid.uuid4().hex[:8]}",
                        endpoint_path=path,
                        http_method=method,
                        component_path=f"paths['{path}']['{method.lower()}'].parameters['{p1.name}'].required",
                        change_type=StructuralChangeType.PARAMETER_REQUIRED_REMOVED.value,
                        old_value="required",
                        new_value="optional",
                        severity=ChangeSeverity.LOW,
                        preliminary_classification=ChangeClassification.NON_BREAKING,
                        explanation=f"Parameter '{p1.name}' ({p1.in_location}) is no longer mandatory (now optional)."
                    )
                )

            # Type change
            if p1.schema_type and p2.schema_type and p1.schema_type != p2.schema_type:
                diffs.append(
                    StructuralChangeRecord(
                        id=f"struct-{uuid.uuid4().hex[:8]}",
                        endpoint_path=path,
                        http_method=method,
                        component_path=f"paths['{path}']['{method.lower()}'].parameters['{p1.name}'].type",
                        change_type=StructuralChangeType.PARAMETER_TYPE_CHANGED.value,
                        old_value=p1.schema_type,
                        new_value=p2.schema_type,
                        severity=ChangeSeverity.HIGH,
                        preliminary_classification=ChangeClassification.BREAKING,
                        explanation=f"Parameter '{p1.name}' type changed from '{p1.schema_type}' to '{p2.schema_type}'."
                    )
                )

            # Default value change
            if p1.default != p2.default:
                diffs.append(
                    StructuralChangeRecord(
                        id=f"struct-{uuid.uuid4().hex[:8]}",
                        endpoint_path=path,
                        http_method=method,
                        component_path=f"paths['{path}']['{method.lower()}'].parameters['{p1.name}'].default",
                        change_type=StructuralChangeType.PARAMETER_DEFAULT_CHANGED.value,
                        old_value=p1.default,
                        new_value=p2.default,
                        severity=ChangeSeverity.MEDIUM,
                        preliminary_classification=ChangeClassification.POTENTIALLY_BREAKING,
                        explanation=f"Parameter '{p1.name}' default value changed from '{p1.default}' to '{p2.default}'."
                    )
                )

            # Enum change
            if p1.enum_values != p2.enum_values:
                diffs.append(
                    StructuralChangeRecord(
                        id=f"struct-{uuid.uuid4().hex[:8]}",
                        endpoint_path=path,
                        http_method=method,
                        component_path=f"paths['{path}']['{method.lower()}'].parameters['{p1.name}'].enum",
                        change_type=StructuralChangeType.PARAMETER_ENUM_CHANGED.value,
                        old_value=p1.enum_values,
                        new_value=p2.enum_values,
                        severity=ChangeSeverity.HIGH,
                        preliminary_classification=ChangeClassification.POTENTIALLY_BREAKING,
                        explanation=f"Parameter '{p1.name}' allowed enum values changed from {p1.enum_values} to {p2.enum_values}."
                    )
                )

        # B. Compare Request Body
        if not ep1.request_body_required and ep2.request_body_required:
            diffs.append(
                StructuralChangeRecord(
                    id=f"struct-{uuid.uuid4().hex[:8]}",
                    endpoint_path=path,
                    http_method=method,
                    component_path=f"paths['{path}']['{method.lower()}'].requestBody.required",
                    change_type=StructuralChangeType.REQUEST_BODY_REQUIRED_CHANGED.value,
                    old_value="optional",
                    new_value="required",
                    severity=ChangeSeverity.CRITICAL,
                    preliminary_classification=ChangeClassification.BREAKING,
                    explanation="Request body changed from optional to strictly REQUIRED."
                )
            )

        if ep1.request_body_schema and ep2.request_body_schema:
            req_diffs = self._compare_schema_properties(
                ep1.request_body_schema,
                ep2.request_body_schema,
                path,
                method,
                "requestBody"
            )
            diffs.extend(req_diffs)

        # C. Compare Responses
        r1_codes = set(ep1.responses.keys())
        r2_codes = set(ep2.responses.keys())

        for code in r1_codes - r2_codes:
            diffs.append(
                StructuralChangeRecord(
                    id=f"struct-{uuid.uuid4().hex[:8]}",
                    endpoint_path=path,
                    http_method=method,
                    component_path=f"paths['{path}']['{method.lower()}'].responses['{code}']",
                    change_type=StructuralChangeType.RESPONSE_STATUS_REMOVED.value,
                    old_value=code,
                    new_value=None,
                    severity=ChangeSeverity.MEDIUM,
                    preliminary_classification=ChangeClassification.POTENTIALLY_BREAKING,
                    explanation=f"Response status code HTTP {code} was removed."
                )
            )

        for code in r2_codes - r1_codes:
            diffs.append(
                StructuralChangeRecord(
                    id=f"struct-{uuid.uuid4().hex[:8]}",
                    endpoint_path=path,
                    http_method=method,
                    component_path=f"paths['{path}']['{method.lower()}'].responses['{code}']",
                    change_type=StructuralChangeType.RESPONSE_STATUS_ADDED.value,
                    old_value=None,
                    new_value=code,
                    severity=ChangeSeverity.LOW,
                    preliminary_classification=ChangeClassification.NON_BREAKING,
                    explanation=f"New documented response status code HTTP {code} was added."
                )
            )

        for code in r1_codes & r2_codes:
            resp1 = ep1.responses[code]
            resp2 = ep2.responses[code]

            # Content types comparison
            if set(resp1.content_types) != set(resp2.content_types) and (resp1.content_types or resp2.content_types):
                diffs.append(
                    StructuralChangeRecord(
                        id=f"struct-{uuid.uuid4().hex[:8]}",
                        endpoint_path=path,
                        http_method=method,
                        component_path=f"paths['{path}']['{method.lower()}'].responses['{code}'].content",
                        change_type=StructuralChangeType.RESPONSE_CONTENT_TYPE_CHANGED.value,
                        old_value=resp1.content_types,
                        new_value=resp2.content_types,
                        severity=ChangeSeverity.HIGH,
                        preliminary_classification=ChangeClassification.BREAKING,
                        explanation=f"HTTP {code} content types changed from {resp1.content_types} to {resp2.content_types}."
                    )
                )

            # Response schema comparison
            if resp1.schema_definition and resp2.schema_definition:
                resp_diffs = self._compare_schema_properties(
                    resp1.schema_definition,
                    resp2.schema_definition,
                    path,
                    method,
                    f"responses['{code}']"
                )
                diffs.extend(resp_diffs)

        return diffs

    def _compare_schema_properties(
        self,
        s1: Dict[str, Any],
        s2: Dict[str, Any],
        path: str,
        method: str,
        context: str
    ) -> List[StructuralChangeRecord]:
        diffs: List[StructuralChangeRecord] = []
        p1 = s1.get("properties", {})
        p2 = s2.get("properties", {})
        req1 = set(s1.get("required", []))
        req2 = set(s2.get("required", []))

        # Field removed
        for field in set(p1.keys()) - set(p2.keys()):
            # If removed from response -> BREAKING for client expecting it; if removed from request -> POTENTIALLY_BREAKING
            is_response = "response" in context.lower()
            diffs.append(
                StructuralChangeRecord(
                    id=f"struct-{uuid.uuid4().hex[:8]}",
                    endpoint_path=path,
                    http_method=method,
                    component_path=f"{context}.schema.properties['{field}']",
                    change_type=StructuralChangeType.SCHEMA_FIELD_REMOVED.value,
                    old_value=field,
                    new_value=None,
                    severity=ChangeSeverity.HIGH if is_response else ChangeSeverity.LOW,
                    preliminary_classification=ChangeClassification.BREAKING if is_response else ChangeClassification.NON_BREAKING,
                    explanation=f"Field '{field}' was removed from {context} schema."
                )
            )

        # Field added
        for field in set(p2.keys()) - set(p1.keys()):
            is_req = field in req2
            is_request = "request" in context.lower()
            if is_req and is_request:
                diffs.append(
                    StructuralChangeRecord(
                        id=f"struct-{uuid.uuid4().hex[:8]}",
                        endpoint_path=path,
                        http_method=method,
                        component_path=f"{context}.schema.properties['{field}']",
                        change_type=StructuralChangeType.SCHEMA_FIELD_ADDED.value,
                        old_value=None,
                        new_value=field,
                        severity=ChangeSeverity.HIGH,
                        preliminary_classification=ChangeClassification.BREAKING,
                        explanation=f"New REQUIRED property '{field}' was added to {context} schema."
                    )
                )
            else:
                diffs.append(
                    StructuralChangeRecord(
                        id=f"struct-{uuid.uuid4().hex[:8]}",
                        endpoint_path=path,
                        http_method=method,
                        component_path=f"{context}.schema.properties['{field}']",
                        change_type=StructuralChangeType.SCHEMA_FIELD_ADDED.value,
                        old_value=None,
                        new_value=field,
                        severity=ChangeSeverity.LOW,
                        preliminary_classification=ChangeClassification.NON_BREAKING,
                        explanation=f"New optional property '{field}' was added to {context} schema."
                    )
                )

        # Field requiredness or type changed
        for field in set(p1.keys()) & set(p2.keys()):
            f1 = p1[field]
            f2 = p2[field]
            t1 = f1.get("type")
            t2 = f2.get("type")
            if t1 and t2 and t1 != t2:
                diffs.append(
                    StructuralChangeRecord(
                        id=f"struct-{uuid.uuid4().hex[:8]}",
                        endpoint_path=path,
                        http_method=method,
                        component_path=f"{context}.schema.properties['{field}'].type",
                        change_type=StructuralChangeType.PARAMETER_TYPE_CHANGED.value,
                        old_value=t1,
                        new_value=t2,
                        severity=ChangeSeverity.HIGH,
                        preliminary_classification=ChangeClassification.BREAKING,
                        explanation=f"Type of property '{field}' in {context} changed from '{t1}' to '{t2}'."
                    )
                )

        return diffs
