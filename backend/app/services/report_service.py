import csv
import io
import json
from typing import Dict, Any
from backend.app.schemas.analysis import AnalysisResult

class ReportService:
    """
    Generates JSON, CSV, and Printable HTML reports from analysis results.
    """

    @staticmethod
    def generate_json(result: AnalysisResult) -> str:
        return result.model_dump_json(indent=2)

    @staticmethod
    def generate_csv(result: AnalysisResult) -> str:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Method",
            "Path",
            "ChangeType",
            "BreakingClassification",
            "Severity",
            "ConfidenceScore",
            "SemanticSimilarity",
            "SemanticDrift",
            "StructuralChanges",
            "BehavioralChanges",
            "ConsumerImpact",
            "MigrationGuidance"
        ])

        for ep in result.endpoints:
            beh_str = "; ".join([f"[{b.get('category')}] {b.get('explanation')}" for b in ep.behavioral_changes])
            struct_str = "; ".join(ep.structural_changes)
            sim_str = f"{(ep.semantic_similarity * 100):.1f}%" if ep.semantic_similarity is not None else "N/A"
            drift_str = f"{(ep.semantic_drift * 100):.1f}%" if ep.semantic_drift is not None else "N/A"

            writer.writerow([
                ep.method,
                ep.path,
                ep.change_type,
                ep.breaking_type,
                ep.severity,
                f"{(ep.confidence_score * 100):.0f}%",
                sim_str,
                drift_str,
                struct_str,
                beh_str,
                ep.consumer_impact,
                ep.migration_recommendation
            ])

        return output.getvalue()

    @staticmethod
    def generate_html(result: AnalysisResult) -> str:
        rows_html = ""
        for ep in result.endpoints:
            breaking_badge = (
                '<span style="background:#fee2e2;color:#991b1b;padding:3px 8px;border-radius:4px;font-weight:bold;font-size:11px;">BREAKING</span>'
                if ep.is_breaking else
                '<span style="background:#dcfce7;color:#166534;padding:3px 8px;border-radius:4px;font-weight:bold;font-size:11px;">NON-BREAKING</span>'
            )
            sim_display = f"{(ep.semantic_similarity * 100):.1f}%" if ep.semantic_similarity is not None else "N/A"

            struct_items = "".join([f"<li>{s}</li>" for s in ep.structural_changes])
            struct_html = f"<ul>{struct_items}</ul>" if struct_items else "<em>None</em>"

            beh_items = "".join([f"<li><strong>{b.get('category')}:</strong> {b.get('explanation')}</li>" for b in ep.behavioral_changes])
            beh_html = f"<ul>{beh_items}</ul>" if beh_items else "<em>None</em>"

            rows_html += f"""
            <tr>
                <td style="font-family:monospace;font-weight:bold;">{ep.method}</td>
                <td style="font-family:monospace;">{ep.path}</td>
                <td>{breaking_badge}<br/><small style="color:#64748b;">{ep.breaking_type}</small></td>
                <td><strong>{ep.severity}</strong></td>
                <td>{sim_display}</td>
                <td style="font-size:12px;">{struct_html}</td>
                <td style="font-size:12px;">{beh_html}</td>
                <td style="font-size:12px;color:#334155;">{ep.consumer_impact}</td>
                <td style="font-size:12px;color:#1e3a8a;">{ep.migration_recommendation}</td>
            </tr>
            """

        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>API Behavioral & Semantic Impact Analysis Report - {result.name or result.metadata.v1_title}</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            margin: 40px;
            color: #0f172a;
            background: #ffffff;
            line-height: 1.5;
        }}
        h1 {{ font-size: 24px; margin-bottom: 4px; }}
        .header {{ border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 24px; }}
        .kpi-row {{ display: flex; gap: 16px; margin-bottom: 28px; }}
        .kpi-card {{
            flex: 1;
            padding: 16px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            background: #f8fafc;
        }}
        .kpi-title {{ font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; }}
        .kpi-value {{ font-size: 28px; font-weight: 900; margin: 4px 0; }}
        table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            margin-top: 16px;
        }}
        th, td {{
            border: 1px solid #e2e8f0;
            padding: 10px 12px;
            text-align: left;
            vertical-align: top;
        }}
        th {{ background: #f1f5f9; font-weight: 600; font-size: 12px; }}
        @media print {{
            body {{ margin: 10px; }}
            .kpi-card {{ border: 1px solid #cbd5e1; }}
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>API Behavioral & Semantic Impact Analysis Report</h1>
        <div style="font-size: 13px; color: #64748b;">
            Analysis ID: <code>{result.id}</code> &bull;
            Generated: {result.created_at} &bull;
            Specification: <strong>{result.metadata.v1_title}</strong> (v{result.metadata.v1_version} &rarr; v{result.metadata.v2_version})
        </div>
    </div>

    <div class="kpi-row">
        <div class="kpi-card">
            <div class="kpi-title">Total Operations</div>
            <div class="kpi-value">{result.summary.total_endpoints}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-title">Breaking Changes</div>
            <div class="kpi-value" style="color: #dc2626;">{result.summary.breaking_count}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-title">Non-Breaking</div>
            <div class="kpi-value" style="color: #16a34a;">{result.summary.non_breaking_count}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-title">Overall Risk Score</div>
            <div class="kpi-value" style="color: #2563eb;">{result.summary.overall_risk_score:.0f} / 100</div>
        </div>
    </div>

    <h2>Detailed Endpoint Findings</h2>
    <table>
        <thead>
            <tr>
                <th>Method</th>
                <th>Path</th>
                <th>Classification</th>
                <th>Severity</th>
                <th>Semantic Sim</th>
                <th>Structural Diff</th>
                <th>Behavioral Diff</th>
                <th>Consumer Impact</th>
                <th>Remediation Advice</th>
            </tr>
        </thead>
        <tbody>
            {rows_html}
        </tbody>
    </table>

    <footer style="margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #94a3b8;">
        Generated by NLP-Based API Semantic & Behavioral Impact Analysis Platform &bull; Powered by sentence-transformers/all-MiniLM-L6-v2 & spaCy
    </footer>
</body>
</html>"""
        return html
