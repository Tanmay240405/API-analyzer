from typing import List, Dict, Any, Optional, Tuple
from backend.app.schemas.change import (
    StructuralChangeRecord,
    SemanticFinding,
    BehavioralFinding,
    ImpactRecord,
    CodeSnippetMigration,
    ChangeClassification
)

class MigrationRecommender:
    """
    Generates actionable remediation advice and before/after code migration snippets
    grounded directly in structural diffs and NLP behavioral contract findings.
    """

    def generate_recommendations(
        self,
        endpoint_path: str,
        http_method: str,
        structural_changes: List[StructuralChangeRecord],
        semantic_findings: List[SemanticFinding],
        behavioral_findings: List[BehavioralFinding]
    ) -> Tuple[str, Dict[str, CodeSnippetMigration]]:
        actions: List[str] = []

        # 1. Structural remedies
        for s in structural_changes:
            if "required" in s.change_type.lower() and "added" in s.change_type.lower():
                param_name = s.new_value if s.new_value and s.new_value not in ["required", "optional"] else (
                    s.old_value if s.old_value and s.old_value not in ["required", "optional"] else s.component_path.split(".")[-1].replace("'", "").replace("]", "").replace("parameters[", "")
                )
                actions.append(f"Update client request builders to explicitly pass newly required parameter/field '{param_name}'.")
            elif "type_changed" in s.change_type.lower():
                actions.append(f"Update model serialization/deserialization to cast property from '{s.old_value}' to '{s.new_value}'.")
            elif "removed" in s.change_type.lower() and "endpoint" in s.change_type.lower():
                actions.append(f"Migrate calls away from decommissioned endpoint '{http_method} {endpoint_path}' to the designated replacement.")
            elif "default_changed" in s.change_type.lower():
                actions.append(f"Explicitly provide value '{s.old_value}' if client application relies on the previous default behavior.")
            elif "response_schema" in s.change_type.lower() or "field_removed" in s.change_type.lower():
                actions.append(f"Audit response parser to handle schema update or removed property '{s.old_value}'.")

        # 2. Behavioral remedies
        for b in behavioral_findings:
            if "precondition" in b.category:
                actions.append(f"Ensure consumer satisfies newly imposed precondition: '{b.evidence}'.")
            elif "execution_model" in b.category:
                actions.append("Adapt client from synchronous response waiting to asynchronous polling (e.g. check status via task URL or register webhook).")
            elif "rate_limit" in b.category:
                actions.append("Configure client-side rate-limiter, implement request throttling, and add exponential backoff for HTTP 429 responses.")
            elif "prohibition" in b.category:
                actions.append(f"Audit requests to ensure forbidden parameters or patterns are omitted: '{b.evidence}'.")

        # 3. Semantic remedies
        for sem in semantic_findings:
            if sem.meaning_change_suspected:
                actions.append(f"Review whether domain logic assumes previous behavior. {sem.explanation}")

        if not actions:
            guidance = "No migration changes are required. Endpoint operates compatibly with existing consumers."
        else:
            guidance = " ".join(dict.fromkeys(actions))  # preserve order without duplicates

        code_snippets = self._generate_code_snippets(
            endpoint_path=endpoint_path,
            http_method=http_method,
            structural_changes=structural_changes,
            behavioral_findings=behavioral_findings
        )

        return guidance, code_snippets

    def _generate_code_snippets(
        self,
        endpoint_path: str,
        http_method: str,
        structural_changes: List[StructuralChangeRecord],
        behavioral_findings: List[BehavioralFinding]
    ) -> Dict[str, CodeSnippetMigration]:
        # Determine whether async shift or required param added
        is_async = any("execution_model" in b.category for b in behavioral_findings)
        req_params = [s.new_value for s in structural_changes if "required_added" in s.change_type.lower() and s.new_value]

        added_field = req_params[0] if req_params else "idempotency_key"

        # cURL
        curl_before = f"curl -X {http_method} 'https://api.domain.com{endpoint_path}' \\\n  -H 'Authorization: Bearer <TOKEN>'"
        if is_async:
            curl_after = f"curl -X {http_method} 'https://api.domain.com{endpoint_path}' \\\n  -H 'Authorization: Bearer <TOKEN>' \\\n  -H '{added_field}: req_uuid_12345'\n# Note: Returns 202 Accepted with polling URL in Location header"
        else:
            curl_after = f"curl -X {http_method} 'https://api.domain.com{endpoint_path}?{added_field}=value' \\\n  -H 'Authorization: Bearer <TOKEN>'"

        # Python
        py_before = (
            f"import requests\n\n"
            f"response = requests.{http_method.lower()}(\n"
            f"    'https://api.domain.com{endpoint_path}',\n"
            f"    headers={{'Authorization': 'Bearer <TOKEN>'}}\n"
            f")\n"
            f"data = response.json()\n"
        )
        if is_async:
            py_after = (
                f"import requests, time\n\n"
                f"# Updated: Send mandatory '{added_field}' and handle async 202 response\n"
                f"response = requests.{http_method.lower()}(\n"
                f"    'https://api.domain.com{endpoint_path}',\n"
                f"    headers={{\n"
                f"        'Authorization': 'Bearer <TOKEN>',\n"
                f"        '{added_field}': 'client_tx_987'\n"
                f"    }}\n"
                f")\n"
                f"if response.status_code == 202:\n"
                f"    task_url = response.headers['Location']\n"
                f"    # Poll until background job completes\n"
                f"    result = requests.get(task_url).json()\n"
            )
        else:
            py_after = (
                f"import requests\n\n"
                f"# Updated: Added newly mandatory parameter '{added_field}'\n"
                f"response = requests.{http_method.lower()}(\n"
                f"    'https://api.domain.com{endpoint_path}',\n"
                f"    headers={{'Authorization': 'Bearer <TOKEN>'}},\n"
                f"    params={{'{added_field}': 'active_value'}}\n"
                f")\n"
                f"data = response.json()\n"
            )

        # TypeScript
        ts_before = (
            f"import axios from 'axios';\n\n"
            f"const {{ data }} = await axios.{http_method.lower()}(\n"
            f"  'https://api.domain.com{endpoint_path}',\n"
            f"  {{ headers: {{ Authorization: 'Bearer <TOKEN>' }} }}\n"
            f");\n"
        )
        if is_async:
            ts_after = (
                f"import axios from 'axios';\n\n"
                f"// Updated: Asynchronous settlement with '{added_field}' header\n"
                f"const response = await axios.{http_method.lower()}(\n"
                f"  'https://api.domain.com{endpoint_path}',\n"
                f"  {{ headers: {{ Authorization: 'Bearer <TOKEN>', '{added_field}': 'tx_123' }} }}\n"
                f");\n"
                f"const statusUrl = response.headers['location'];\n"
                f"// Poll or wait for webhook receipt\n"
            )
        else:
            ts_after = (
                f"import axios from 'axios';\n\n"
                f"// Updated: Explicit required '{added_field}' passed in payload/query\n"
                f"const {{ data }} = await axios.{http_method.lower()}(\n"
                f"  'https://api.domain.com{endpoint_path}',\n"
                f"  {{\n"
                f"    params: {{ {added_field}: 'validated_value' }},\n"
                f"    headers: {{ Authorization: 'Bearer <TOKEN>' }}\n"
                f"  }}\n"
                f");\n"
            )

        return {
            "curl": CodeSnippetMigration(
                language="curl",
                before_code=curl_before,
                after_code=curl_after,
                explanation="Update cURL request headers and parameters to comply with v2 specification."
            ),
            "python": CodeSnippetMigration(
                language="python",
                before_code=py_before,
                after_code=py_after,
                explanation="Update Python Requests client to provide required parameters and handle response status."
            ),
            "typescript": CodeSnippetMigration(
                language="typescript",
                before_code=ts_before,
                after_code=ts_after,
                explanation="Update TypeScript Axios client with appropriate typing and payload attributes."
            )
        }

Tuple_Guidance_And_Snippets = Tuple[str, Dict[str, CodeSnippetMigration]]
