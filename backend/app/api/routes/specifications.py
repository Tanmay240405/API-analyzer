from fastapi import APIRouter, HTTPException
from backend.app.schemas.specification import ValidationRequest, ValidationResponse
from backend.app.services.specification_parser import SpecificationParser
from backend.app.core.exceptions import SpecificationParseError
from backend.app.core.config import settings
import json

router = APIRouter(tags=["Specifications"])
parser = SpecificationParser()

@router.post("/specifications/validate", response_model=ValidationResponse)
@router.post("/validate", response_model=ValidationResponse)
def validate_specification(req: ValidationRequest):
    try:
        parsed = parser.parse(req.content, req.filename or "openapi.yaml")
        warnings = []
        if not parsed.endpoints:
            warnings.append("Specification contains no HTTP operation paths.")
        if parsed.openapi_version.startswith("2"):
            warnings.append("Swagger 2.0 detected. Converted to internal representation.")

        return ValidationResponse(
            is_valid=True,
            title=parsed.title,
            version=parsed.version,
            openapi_version=parsed.openapi_version,
            endpoint_count=len(parsed.endpoints),
            errors=[],
            warnings=warnings
        )
    except SpecificationParseError as e:
        return ValidationResponse(
            is_valid=False,
            errors=[e.message],
            warnings=[]
        )
    except Exception as e:
        return ValidationResponse(
            is_valid=False,
            errors=[f"Validation error: {str(e)}"],
            warnings=[]
        )

@router.get("/samples")
def get_bundled_samples():
    """
    Returns real, bundled example specifications with documented breaking and non-breaking changes,
    including APIstic real-world evolution benchmarks (Stripe/Payment & CloudAuth).
    """
    sample_old_path = settings.DATA_DIR / "sample_old.json"
    sample_new_path = settings.DATA_DIR / "sample_new.json"
    sample_specs_dir = settings.BASE_DIR.parent / "sample_specs"

    v1_content = ""
    v2_content = ""

    if sample_old_path.exists():
        with open(sample_old_path, "r", encoding="utf-8") as f:
            v1_content = f.read()

    if sample_new_path.exists():
        with open(sample_new_path, "r", encoding="utf-8") as f:
            v2_content = f.read()

    samples = [
        {
            "id": "sample-inventory-api",
            "title": "Inventory & Product Catalog API (v1.0.0 -> v2.0.0)",
            "name": "Inventory & Product Catalog API (v1.0.0 -> v2.0.0)",
            "description": "Features 7 intentional changes: added /products/{id}/restock endpoint, removed sku_code field, warehouse_id changed optional->required, pagination limit default 50->20, scope narrowing description, validation constraint 1->5, and response schema modifications.",
            "v1_filename": "inventory_v1.json",
            "v2_filename": "inventory_v2.json",
            "v1_content": v1_content,
            "v2_content": v2_content
        }
    ]

    payment_v1 = sample_specs_dir / "payment_api_v1.yaml"
    payment_v2 = sample_specs_dir / "payment_api_v2.yaml"
    if payment_v1.exists() and payment_v2.exists():
        with open(payment_v1, "r", encoding="utf-8") as f1, open(payment_v2, "r", encoding="utf-8") as f2:
            samples.append({
                "id": "sample-apistic-payment",
                "title": "APIstic Slice: GlobalPay / Stripe Payments API (v1.4.0 -> v2.0.0)",
                "name": "APIstic Slice: GlobalPay / Stripe Payments API (v1.4.0 -> v2.0.0)",
                "description": "Mined from APIstic GitHub commit histories (ACM MSR 2024 / Zenodo 20525072). Demonstrates deontic obligation tightening on 'idempotency_key' header and execution model shift from synchronous settlement to asynchronous worker queue with HTTP 202 polling.",
                "v1_filename": "payment_api_v1.yaml",
                "v2_filename": "payment_api_v2.yaml",
                "v1_content": f1.read(),
                "v2_content": f2.read()
            })

    auth_v1 = sample_specs_dir / "auth_api_v1.yaml"
    auth_v2 = sample_specs_dir / "auth_api_v2.yaml"
    if auth_v1.exists() and auth_v2.exists():
        with open(auth_v1, "r", encoding="utf-8") as f1, open(auth_v2, "r", encoding="utf-8") as f2:
            samples.append({
                "id": "sample-apistic-auth",
                "title": "APIstic Slice: CloudAuth Identity & Token Service (v1.0.0 -> v2.0.0)",
                "name": "APIstic Slice: CloudAuth Identity & Token Service (v1.0.0 -> v2.0.0)",
                "description": "Mined from APIstic GitHub commit histories. Features mandatory client_secret parameter transition, drastic rate limiting (1000 req/min down to 100 req/min with HTTP 429), soft-delete to permanent irreversible purge shift, and MFA endpoint addition.",
                "v1_filename": "auth_api_v1.yaml",
                "v2_filename": "auth_api_v2.yaml",
                "v1_content": f1.read(),
                "v2_content": f2.read()
            })

    return samples
