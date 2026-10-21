from fastapi import APIRouter, HTTPException, Query, Response
from fastapi.responses import HTMLResponse, PlainTextResponse
from backend.app.repositories.analysis_repository import analysis_repository
from backend.app.services.report_service import ReportService

router = APIRouter(tags=["Exports"])

@router.get("/analyses/{analysis_id}/export")
@router.get("/analysis/{analysis_id}/export")
def export_analysis_report(
    analysis_id: str,
    format: str = Query("json", pattern="^(json|csv|html)$")
):
    result = analysis_repository.get_analysis(analysis_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Analysis '{analysis_id}' not found.")

    fmt = format.lower()
    safe_name = (result.name or "api_analysis").replace(" ", "_").replace("/", "_")

    if fmt == "csv":
        csv_content = ReportService.generate_csv(result)
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=analysis_{safe_name}.csv"}
        )
    elif fmt == "html":
        html_content = ReportService.generate_html(result)
        return HTMLResponse(content=html_content)
    else:
        json_content = ReportService.generate_json(result)
        return Response(
            content=json_content,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=analysis_{safe_name}.json"}
        )
