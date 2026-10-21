from typing import Dict, Any, List, Optional
from backend.models.schemas import CodeMigration, EndpointChange

class MigrationAdviceGenerator:
    """
    Generates actionable migration guides, impact analyses, and Before vs After code snippets
    (cURL, Python Requests, JavaScript/TypeScript Fetch) for detected API changes.
    """

    def generate_impact_and_migration(
        self,
        method: str,
        path: str,
        change_type: str,
        is_breaking: bool,
        breaking_type: str,
        structural_changes: List[str],
        behavioral_changes: List[Any],
        v1_ep: Optional[Dict[str, Any]] = None,
        v2_ep: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Returns:
            {
                "consumer_impact": str,
                "migration_recommendation": str,
                "code_migration": Dict[str, CodeMigration]
            }
        """
        method = method.upper()

        if change_type == "REMOVED":
            impact = (
                f"CRITICAL: Endpoint '{method} {path}' has been completely removed in the new API version. "
                "Any existing client issuing requests to this path will immediately fail with HTTP 404 Not Found."
            )
            recommendation = (
                f"Identify all client services calling '{method} {path}'. Check release notes for a successor route "
                "or refactor client code to remove dependence on this functionality."
            )
            code = self._generate_code_snippets(
                method, path,
                v1_comment="Deprecated call in API v1",
                v2_comment="Endpoint removed. Migrate to successor endpoint or handle 404 fallback",
                is_removed=True
            )
            return {
                "consumer_impact": impact,
                "migration_recommendation": recommendation,
                "code_migration": code
            }

        if change_type == "ADDED":
            impact = f"Non-breaking addition. Endpoint '{method} {path}' is new in this version. Existing clients are unaffected."
            recommendation = f"API consumers can optionally adopt '{method} {path}' to leverage newly released capabilities."
            code = self._generate_code_snippets(
                method, path,
                v1_comment="Endpoint did not exist in v1",
                v2_comment=f"New endpoint available in v2"
            )
            return {
                "consumer_impact": impact,
                "migration_recommendation": recommendation,
                "code_migration": code
            }

        # MODIFIED endpoint
        impact_points = []
        rec_points = []

        if structural_changes:
            for sc in structural_changes:
                if "new mandatory parameter" in sc.lower() or "newly required" in sc.lower() or "required" in sc.lower():
                    impact_points.append(f"Clients failing to provide required fields will receive HTTP 400 or 422: {sc}")
                    rec_points.append(f"Update request payloads to include newly mandatory attributes ({sc}).")
                elif "type changed" in sc.lower():
                    impact_points.append(f"Data type serialization mismatch: {sc}")
                    rec_points.append(f"Cast and serialize parameter with updated type ({sc}).")
                elif "deprecated" in sc.lower():
                    impact_points.append("Endpoint is marked for future retirement.")
                    rec_points.append("Schedule migration away from this route before the next major version sunset.")

        if behavioral_changes:
            for bc in behavioral_changes:
                cat = getattr(bc, "category", "") if hasattr(bc, "category") else bc.get("category", "")
                expl = getattr(bc, "explanation", "") if hasattr(bc, "explanation") else bc.get("explanation", "")
                if cat == "postcondition_altered":
                    impact_points.append("Execution model changed (e.g. Asynchronous execution): responses may no longer return immediately completed data.")
                    rec_points.append("Implement polling or webhook listener to track asynchronous completion.")
                elif cat == "rate_limit_reduced" or cat == "rate_limit_imposed":
                    impact_points.append("Tighter rate limiting may trigger HTTP 429 Too Many Requests under production load.")
                    rec_points.append("Implement exponential backoff retry logic and client-side request caching.")
                elif cat == "precondition_tightened":
                    impact_points.append(f"New precondition required: {expl}")
                    rec_points.append(f"Ensure caller fulfills behavioral precondition: {expl}")
                elif cat == "semantic_drift":
                    impact_points.append("Semantic drift in documented operation behavior may cause unexpected domain logic outcomes.")
                    rec_points.append("Review business logic against updated documentation to prevent semantic bugs.")

        if not impact_points:
            if is_breaking:
                impact = "Potentially breaking modifications detected across contract parameters or responses."
                recommendation = "Audit client integration test suite against the new specification."
            else:
                impact = "Backward-compatible modifications. Existing clients should continue operating normally."
                recommendation = "No mandatory migration required. Check updated schema for optional improvements."
        else:
            impact = " ".join(impact_points)
            recommendation = " ".join(rec_points)

        code = self._generate_code_snippets(
            method, path,
            v1_comment="v1 legacy client request",
            v2_comment="v2 updated client request adhering to new contract and parameters",
            v1_ep=v1_ep,
            v2_ep=v2_ep
        )

        return {
            "consumer_impact": impact,
            "migration_recommendation": recommendation,
            "code_migration": code
        }

    def _generate_code_snippets(
        self,
        method: str,
        path: str,
        v1_comment: str,
        v2_comment: str,
        is_removed: bool = False,
        v1_ep: Optional[Dict[str, Any]] = None,
        v2_ep: Optional[Dict[str, Any]] = None
    ) -> Dict[str, CodeMigration]:
        # Generate cURL
        curl_v1 = f"# {v1_comment}\ncurl -X {method} \"https://api.example.com{path}\" \\\n  -H \"Accept: application/json\""
        if is_removed:
            curl_v2 = f"# {v2_comment}\n# Route retired. Contact API provider for new endpoint URL."
        else:
            curl_v2 = f"# {v2_comment}\ncurl -X {method} \"https://api.example.com{path}\" \\\n  -H \"Accept: application/json\" \\\n  -H \"X-API-Version: 2.0\""

        # Generate Python requests
        py_v1 = (
            f"# {v1_comment}\nimport requests\n\n"
            f"response = requests.{method.lower()}(\n"
            f"    \"https://api.example.com{path}\",\n"
            f"    headers={{\"Accept\": \"application/json\"}}\n"
            f")\ndata = response.json()"
        )
        if is_removed:
            py_v2 = f"# {v2_comment}\n# Endpoint removed in v2. Replace call with successor service."
        else:
            py_v2 = (
                f"# {v2_comment}\nimport requests\n\n"
                f"response = requests.{method.lower()}(\n"
                f"    \"https://api.example.com{path}\",\n"
                f"    headers={{\"Accept\": \"application/json\", \"X-API-Version\": \"2.0\"}},\n"
                f"    timeout=10\n"
                f")\nresponse.raise_for_status()\ndata = response.json()"
            )

        # Generate TypeScript fetch
        ts_v1 = (
            f"// {v1_comment}\n"
            f"const res = await fetch(\"https://api.example.com{path}\", {{\n"
            f"  method: \"{method}\",\n"
            f"  headers: {{ \"Accept\": \"application/json\" }}\n"
            f"}});\nconst data = await res.json();"
        )
        if is_removed:
            ts_v2 = f"// {v2_comment}\n// Route removed in v2 specification."
        else:
            ts_v2 = (
                f"// {v2_comment}\n"
                f"const res = await fetch(\"https://api.example.com{path}\", {{\n"
                f"  method: \"{method}\",\n"
                f"  headers: {{\n"
                f"    \"Accept\": \"application/json\",\n"
                f"    \"X-API-Version\": \"2.0\"\n"
                f"  }}\n"
                f"}});\nif (!res.ok) throw new Error(`HTTP error! status: ${{res.status}}`);\nconst data = await res.json();"
            )

        return {
            "curl": CodeMigration(
                language="curl",
                v1_snippet=curl_v1,
                v2_snippet=curl_v2,
                explanation="cURL CLI invocation comparison"
            ),
            "python": CodeMigration(
                language="python",
                v1_snippet=py_v1,
                v2_snippet=py_v2,
                explanation="Python Requests client integration"
            ),
            "typescript": CodeMigration(
                language="typescript",
                v1_snippet=ts_v1,
                v2_snippet=ts_v2,
                explanation="TypeScript / JavaScript Fetch integration"
            )
        }
