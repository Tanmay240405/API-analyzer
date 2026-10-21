from typing import List, Dict, Any

# Academic Benchmark Dataset: Curated real-world API evolution test cases
# with Ground Truth breaking annotations, distinguishing between structural breaks,
# subtle behavioral breaks, and non-breaking changes.

BENCHMARK_CASES: List[Dict[str, Any]] = [
    {
        "endpoint_name": "POST /api/v1/payments/charge",
        "description_v1": "Processes card payments synchronously and returns transaction receipt immediately upon settlement.",
        "description_v2": "Enqueues payment request into background worker queue. Returns asynchronous task token for polling.",
        "change_type": "BEHAVIORAL_ASYNC_SHIFT",
        "ground_truth_breaking": True,
        "structural_diff_detects": False, # Structural schemas may both have 200/202 JSON
        "key_reason": "Execution shifted from synchronous immediate completion to asynchronous background queuing."
    },
    {
        "endpoint_name": "GET /api/v1/users/{id}/profile",
        "description_v1": "Retrieves public profile information. Caller may optionally provide authentication token.",
        "description_v2": "Retrieves public profile information. Caller must provide valid Bearer authentication token.",
        "change_type": "DEONTIC_MODALITY_TIGHTENING",
        "ground_truth_breaking": True,
        "structural_diff_detects": False, # If auth was defined loosely in spec
        "key_reason": "Deontic shift: optional authentication turned into mandatory requirement."
    },
    {
        "endpoint_name": "POST /api/v1/auth/token",
        "description_v1": "Issues access token. Rate limited to 1000 requests per minute per IP address.",
        "description_v2": "Issues access token. Strictly rate limited to 50 requests per minute per IP address.",
        "change_type": "RATE_LIMIT_REDUCTION",
        "ground_truth_breaking": True,
        "structural_diff_detects": False, # Rate limits are almost never typed in OpenAPI schema properties
        "key_reason": "Severe quota reduction from 1000 to 50 req/min will cause high volume clients to fail with HTTP 429."
    },
    {
        "endpoint_name": "DELETE /api/v1/documents/{id}",
        "description_v1": "Flags document as archived. Content is preserved in recycle bin for 30 days.",
        "description_v2": "Permanently deletes document and all linked revisions irreversibly from database.",
        "change_type": "POSTCONDITION_DESTRUCTIVE_SHIFT",
        "ground_truth_breaking": True,
        "structural_diff_detects": False,
        "key_reason": "Destructive postcondition shift: soft-archive turned into permanent irreversible deletion."
    },
    {
        "endpoint_name": "POST /api/v1/orders/checkout",
        "description_v1": "Creates order. Accepts currency code as 3-letter ISO string.",
        "description_v2": "Creates order. Mandatory precondition: client account must have verified billing address prior to calling.",
        "change_type": "PRECONDITION_TIGHTENED",
        "ground_truth_breaking": True,
        "structural_diff_detects": False,
        "key_reason": "New business domain precondition requires pre-verified billing profile."
    },
    {
        "endpoint_name": "GET /api/v1/products/search",
        "description_v1": "Searches store catalogue by keyword.",
        "description_v2": "Searches store catalogue by keyword. Supports optional pagination parameters limit and offset.",
        "change_type": "OPTIONAL_EXTENSION",
        "ground_truth_breaking": False,
        "structural_diff_detects": False,
        "key_reason": "Purely additive optional capability, completely backward-compatible."
    },
    {
        "endpoint_name": "GET /api/v1/health",
        "description_v1": "Returns service health status and uptime in seconds.",
        "description_v2": "Returns service health status, uptime in seconds, and container runtime version.",
        "change_type": "NON_BREAKING_DOCUMENTATION_UPDATE",
        "ground_truth_breaking": False,
        "structural_diff_detects": False,
        "key_reason": "Informative clarification of response payload."
    },
    {
        "endpoint_name": "POST /api/v1/customers",
        "description_v1": "Registers new customer. Accepts customer name, email, and phone.",
        "description_v2": "Registers new customer. Accepts customer name, email, and phone. Deprecated: will be sunset in v3.",
        "change_type": "DEPRECATION_WARNING",
        "ground_truth_breaking": False,
        "structural_diff_detects": False,
        "key_reason": "Deprecation warning warns of future retirement but does not immediately break current contract."
    },
    {
        "endpoint_name": "PUT /api/v1/inventory/{sku}",
        "description_v1": "Updates product inventory quantity.",
        "description_v2": "Endpoint removed in v2. Use /api/v2/warehouse/stock instead.",
        "change_type": "ENDPOINT_REMOVAL",
        "ground_truth_breaking": True,
        "structural_diff_detects": True, # Structural diff catches removal easily
        "key_reason": "Route removed from specification."
    },
    {
        "endpoint_name": "PATCH /api/v1/settings",
        "description_v1": "Updates user settings. Requires dark_mode boolean.",
        "description_v2": "Updates user settings. Mandatory parameter tenant_id string is newly required.",
        "change_type": "REQUIRED_PARAM_ADDED",
        "ground_truth_breaking": True,
        "structural_diff_detects": True, # Structural diff catches mandatory param addition
        "key_reason": "Mandatory parameter added to request schema."
    }
]
