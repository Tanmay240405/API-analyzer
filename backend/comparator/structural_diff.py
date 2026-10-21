from typing import Dict, Any, List, Tuple
from deepdiff import DeepDiff

class StructuralComparator:
    """
    Compares two normalized endpoint definitions and identifies all structural differences.
    Returns categorized structural changes and preliminary breaking indicators.
    """
    def compare_endpoints(
        self,
        v1_ep: Dict[str, Any],
        v2_ep: Dict[str, Any]
    ) -> Tuple[List[str], bool, List[str]]:
        """
        Returns:
            (structural_changes, is_breaking, breaking_reasons)
        """
        changes: List[str] = []
        breaking_reasons: List[str] = []
        is_breaking = False

        # 1. Deprecation check
        if not v1_ep.get("deprecated", False) and v2_ep.get("deprecated", False):
            changes.append("Endpoint marked as DEPRECATED in v2.")

        # 2. Parameters comparison
        v1_params = {f"{p.get('name')}:{p.get('in')}": p for p in v1_ep.get("parameters", [])}
        v2_params = {f"{p.get('name')}:{p.get('in')}": p for p in v2_ep.get("parameters", [])}

        # Check added parameters
        for p_key, p2 in v2_params.items():
            if p_key not in v1_params:
                p_name = p2.get("name")
                p_in = p2.get("in")
                if p2.get("required", False):
                    msg = f"New mandatory parameter added: '{p_name}' ({p_in})."
                    changes.append(msg)
                    breaking_reasons.append(msg)
                    is_breaking = True
                else:
                    changes.append(f"New optional parameter added: '{p_name}' ({p_in}).")

        # Check removed parameters
        for p_key, p1 in v1_params.items():
            if p_key not in v2_params:
                p_name = p1.get("name")
                p_in = p1.get("in")
                msg = f"Parameter removed: '{p_name}' ({p_in})."
                changes.append(msg)
                # If a required parameter was removed, or path param, it's a structural disruption
                if p1.get("required", False) or p_in == "path":
                    breaking_reasons.append(msg)
                    is_breaking = True

        # Check modified parameters
        for p_key in set(v1_params.keys()).intersection(v2_params.keys()):
            p1 = v1_params[p_key]
            p2 = v2_params[p_key]
            p_name = p1.get("name")

            # Optional -> Required (Breaking)
            if not p1.get("required", False) and p2.get("required", False):
                msg = f"Parameter '{p_name}' changed from optional to REQUIRED."
                changes.append(msg)
                breaking_reasons.append(msg)
                is_breaking = True

            # Type change
            t1 = p1.get("type")
            t2 = p2.get("type")
            if t1 != t2 and t1 != "any" and t2 != "any":
                msg = f"Parameter '{p_name}' type changed from '{t1}' to '{t2}'."
                changes.append(msg)
                breaking_reasons.append(msg)
                is_breaking = True

            # Enum restriction
            e1 = set(p1.get("enum") or [])
            e2 = set(p2.get("enum") or [])
            if e1 and e2:
                removed_enums = e1 - e2
                if removed_enums:
                    msg = f"Parameter '{p_name}' enum values restricted: removed {list(removed_enums)}."
                    changes.append(msg)
                    breaking_reasons.append(msg)
                    is_breaking = True

        # 3. Request Body comparison
        rb1 = v1_ep.get("request_body", {})
        rb2 = v2_ep.get("request_body", {})
        
        # Request body became required
        if not rb1.get("required", False) and rb2.get("required", False):
            msg = "Request body was optional in v1, now strictly REQUIRED in v2."
            changes.append(msg)
            breaking_reasons.append(msg)
            is_breaking = True

        # Request body schemas comparison
        s1 = rb1.get("schemas", {}).get("application/json", {})
        s2 = rb2.get("schemas", {}).get("application/json", {})

        if s1 and s2:
            props1 = s1.get("properties", {})
            props2 = s2.get("properties", {})
            req1 = set(s1.get("required", []) or [])
            req2 = set(s2.get("required", []) or [])

            # Newly required request body fields
            new_required_fields = req2 - req1
            for field in new_required_fields:
                msg = f"Request body field '{field}' is newly REQUIRED in v2."
                changes.append(msg)
                breaking_reasons.append(msg)
                is_breaking = True

            # Removed fields
            removed_props = set(props1.keys()) - set(props2.keys())
            for field in removed_props:
                changes.append(f"Request body field '{field}' removed in v2.")

            # Type change in request body fields
            for prop in set(props1.keys()).intersection(props2.keys()):
                p1_type = props1[prop].get("type") if isinstance(props1[prop], dict) else None
                p2_type = props2[prop].get("type") if isinstance(props2[prop], dict) else None
                if p1_type and p2_type and p1_type != p2_type:
                    msg = f"Request body property '{prop}' type changed from '{p1_type}' to '{p2_type}'."
                    changes.append(msg)
                    breaking_reasons.append(msg)
                    is_breaking = True

        # 4. Responses comparison
        resp1 = v1_ep.get("responses", {})
        resp2 = v2_ep.get("responses", {})

        # Successful status codes removed
        v1_success_codes = {c for c in resp1.keys() if c.startswith("2")}
        v2_success_codes = {c for c in resp2.keys() if c.startswith("2")}
        removed_success = v1_success_codes - v2_success_codes
        if removed_success:
            msg = f"Success response code(s) removed: {list(removed_success)}."
            changes.append(msg)
            breaking_reasons.append(msg)
            is_breaking = True

        # New error codes added
        v1_error_codes = {c for c in resp1.keys() if c.startswith("4") or c.startswith("5")}
        v2_error_codes = {c for c in resp2.keys() if c.startswith("4") or c.startswith("5")}
        new_error_codes = v2_error_codes - v1_error_codes
        if new_error_codes:
            changes.append(f"New error status code(s) documented: {list(new_error_codes)}.")

        # Response schema changes for 200 / 201
        for code in ["200", "201"]:
            if code in resp1 and code in resp2:
                r_s1 = resp1[code].get("schemas", {}).get("application/json", {})
                r_s2 = resp2[code].get("schemas", {}).get("application/json", {})
                if r_s1 and r_s2:
                    p1 = r_s1.get("properties", {})
                    p2 = r_s2.get("properties", {})
                    # If response field removed that consumers might parse
                    removed_resp_props = set(p1.keys()) - set(p2.keys())
                    if removed_resp_props:
                        msg = f"Response {code} field(s) removed: {list(removed_resp_props)}."
                        changes.append(msg)
                        breaking_reasons.append(msg)
                        is_breaking = True

        return changes, is_breaking, breaking_reasons
