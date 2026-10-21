import sqlite3
import json
import os
import uuid
import datetime
from typing import List, Optional, Dict, Any
from backend.app.core.config import settings
from backend.app.schemas.analysis import (
    AnalysisResult,
    HistoryItemSummary,
    DashboardStatsResponse
)
from backend.app.schemas.evaluation import EvaluationMetrics
from backend.app.core.logging import get_logger

logger = get_logger(__name__)

class AnalysisRepository:
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = str(db_path or settings.DB_PATH)
        self.init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    def init_db(self):
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        with self._get_connection() as conn:
            # 1. Analyses table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS analyses (
                    id TEXT PRIMARY KEY,
                    created_at TEXT NOT NULL,
                    name TEXT,
                    v1_title TEXT,
                    v2_title TEXT,
                    v1_version TEXT,
                    v2_version TEXT,
                    v1_filename TEXT,
                    v2_filename TEXT,
                    total_endpoints INTEGER DEFAULT 0,
                    breaking_count INTEGER DEFAULT 0,
                    potentially_breaking_count INTEGER DEFAULT 0,
                    non_breaking_count INTEGER DEFAULT 0,
                    risk_score REAL DEFAULT 0.0,
                    status TEXT DEFAULT 'Completed',
                    data_json TEXT NOT NULL
                )
            """)

            # 2. Analysis Summaries table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS analysis_summaries (
                    analysis_id TEXT PRIMARY KEY,
                    total_endpoints INTEGER NOT NULL,
                    added_endpoints INTEGER DEFAULT 0,
                    removed_endpoints INTEGER DEFAULT 0,
                    modified_endpoints INTEGER DEFAULT 0,
                    structural_changes_count INTEGER DEFAULT 0,
                    semantic_drift_count INTEGER DEFAULT 0,
                    behavioral_changes_count INTEGER DEFAULT 0,
                    breaking_count INTEGER DEFAULT 0,
                    potentially_breaking_count INTEGER DEFAULT 0,
                    non_breaking_count INTEGER DEFAULT 0,
                    overall_risk_score REAL DEFAULT 0.0,
                    processing_duration_ms REAL DEFAULT 0.0,
                    FOREIGN KEY (analysis_id) REFERENCES analyses (id) ON DELETE CASCADE
                )
            """)

            # 3. Individual Change Findings table (normalized result structure)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS change_findings (
                    id TEXT PRIMARY KEY,
                    analysis_id TEXT NOT NULL,
                    endpoint_path TEXT NOT NULL,
                    http_method TEXT NOT NULL,
                    change_type TEXT NOT NULL,
                    breaking_classification TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    confidence_score REAL DEFAULT 0.9,
                    explanation TEXT,
                    consumer_impact TEXT,
                    migration_guidance TEXT,
                    FOREIGN KEY (analysis_id) REFERENCES analyses (id) ON DELETE CASCADE
                )
            """)

            # 4. Evaluation Runs table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS evaluation_runs (
                    id TEXT PRIMARY KEY,
                    created_at TEXT NOT NULL,
                    total_cases INTEGER NOT NULL,
                    nlp_precision REAL NOT NULL,
                    nlp_recall REAL NOT NULL,
                    nlp_f1 REAL NOT NULL,
                    nlp_accuracy REAL NOT NULL,
                    struct_precision REAL NOT NULL,
                    struct_recall REAL NOT NULL,
                    struct_f1 REAL NOT NULL,
                    struct_accuracy REAL NOT NULL,
                    raw_metrics_json TEXT NOT NULL
                )
            """)
            conn.commit()

    def save_analysis(self, result: AnalysisResult):
        data_json_str = result.model_dump_json()
        with self._get_connection() as conn:
            # 1. Insert analyses
            conn.execute("""
                INSERT OR REPLACE INTO analyses (
                    id, created_at, name, v1_title, v2_title,
                    v1_version, v2_version, v1_filename, v2_filename,
                    total_endpoints, breaking_count, potentially_breaking_count,
                    non_breaking_count, risk_score, status, data_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                result.id,
                result.created_at,
                result.name,
                result.metadata.v1_title,
                result.metadata.v2_title,
                result.metadata.v1_version,
                result.metadata.v2_version,
                result.metadata.v1_filename,
                result.metadata.v2_filename,
                result.summary.total_endpoints,
                result.summary.breaking_count,
                result.summary.potentially_breaking_count,
                result.summary.non_breaking_count,
                result.summary.overall_risk_score,
                "Completed",
                data_json_str
            ))

            # 2. Insert analysis_summaries
            conn.execute("""
                INSERT OR REPLACE INTO analysis_summaries (
                    analysis_id, total_endpoints, added_endpoints, removed_endpoints,
                    modified_endpoints, structural_changes_count, semantic_drift_count,
                    behavioral_changes_count, breaking_count, potentially_breaking_count,
                    non_breaking_count, overall_risk_score, processing_duration_ms
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                result.id,
                result.summary.total_endpoints,
                result.summary.added_endpoints,
                result.summary.removed_endpoints,
                result.summary.modified_endpoints,
                result.summary.structural_changes_count,
                result.summary.semantic_drift_count,
                result.summary.behavioral_changes_count,
                result.summary.breaking_count,
                result.summary.potentially_breaking_count,
                result.summary.non_breaking_count,
                result.summary.overall_risk_score,
                result.metadata.processing_duration_ms
            ))

            # 3. Insert individual change findings
            conn.execute("DELETE FROM change_findings WHERE analysis_id = ?", (result.id,))
            for ep in result.endpoints:
                finding_id = f"fnd-{uuid.uuid4().hex[:12]}"
                conn.execute("""
                    INSERT INTO change_findings (
                        id, analysis_id, endpoint_path, http_method, change_type,
                        breaking_classification, severity, confidence_score,
                        explanation, consumer_impact, migration_guidance
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    finding_id,
                    result.id,
                    ep.path,
                    ep.method,
                    ep.change_type,
                    ep.breaking_type,
                    ep.severity,
                    ep.confidence_score,
                    "; ".join(ep.structural_changes) or (ep.behavioral_changes[0].get("explanation") if ep.behavioral_changes else "No changes"),
                    ep.consumer_impact,
                    ep.migration_recommendation
                ))

            conn.commit()

    def get_analysis(self, analysis_id: str) -> Optional[AnalysisResult]:
        with self._get_connection() as conn:
            row = conn.execute("SELECT data_json FROM analyses WHERE id = ?", (analysis_id,)).fetchone()
            if not row:
                return None
            data = json.loads(row["data_json"])
            return AnalysisResult(**data)

    def list_analyses(self, limit: int = 50, offset: int = 0) -> List[HistoryItemSummary]:
        with self._get_connection() as conn:
            cursor = conn.execute("""
                SELECT id, created_at, name, v1_title, v2_title,
                       v1_version, v2_version, v1_filename, v2_filename,
                       total_endpoints, breaking_count, potentially_breaking_count,
                       non_breaking_count, risk_score, status
                FROM analyses
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            """, (limit, offset))
            rows = cursor.fetchall()

            return [
                HistoryItemSummary(
                    id=row["id"],
                    created_at=row["created_at"],
                    name=row["name"],
                    v1_title=row["v1_title"] or "Untitled API",
                    v2_title=row["v2_title"] or "Untitled API",
                    v1_version=row["v1_version"] or "1.0.0",
                    v2_version=row["v2_version"] or "2.0.0",
                    v1_filename=row["v1_filename"] or "v1.yaml",
                    v2_filename=row["v2_filename"] or "v2.yaml",
                    total_endpoints=row["total_endpoints"],
                    breaking_count=row["breaking_count"],
                    potentially_breaking_count=row["potentially_breaking_count"],
                    non_breaking_count=row["non_breaking_count"],
                    status=row["status"],
                    risk_score=row["risk_score"]
                )
                for row in rows
            ]

    def delete_analysis(self, analysis_id: str) -> bool:
        with self._get_connection() as conn:
            cursor = conn.execute("DELETE FROM analyses WHERE id = ?", (analysis_id,))
            conn.commit()
            return cursor.rowcount > 0

    def record_evaluation_run(self, metrics: EvaluationMetrics) -> str:
        run_id = f"eval-run-{uuid.uuid4().hex[:12]}"
        now = datetime.datetime.now().isoformat()
        with self._get_connection() as conn:
            conn.execute("""
                INSERT INTO evaluation_runs (
                    id, created_at, total_cases,
                    nlp_precision, nlp_recall, nlp_f1, nlp_accuracy,
                    struct_precision, struct_recall, struct_f1, struct_accuracy,
                    raw_metrics_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                run_id,
                now,
                metrics.total_cases,
                metrics.nlp_enhanced.precision,
                metrics.nlp_enhanced.recall,
                metrics.nlp_enhanced.f1_score,
                metrics.nlp_enhanced.accuracy,
                metrics.structural_only.precision,
                metrics.structural_only.recall,
                metrics.structural_only.f1_score,
                metrics.structural_only.accuracy,
                metrics.model_dump_json()
            ))
            conn.commit()
        return run_id

    def get_dashboard_stats(self) -> DashboardStatsResponse:
        with self._get_connection() as conn:
            count_row = conn.execute("""
                SELECT 
                    COUNT(*) as total_analyses,
                    SUM(breaking_count) as total_breaking,
                    SUM(potentially_breaking_count) as total_pot_breaking,
                    SUM(non_breaking_count) as total_non_breaking
                FROM analyses
            """).fetchone()

            total_analyses = count_row["total_analyses"] or 0
            total_breaking = count_row["total_breaking"] or 0
            total_pot_breaking = count_row["total_pot_breaking"] or 0
            total_non_breaking = count_row["total_non_breaking"] or 0

            # Scan stored records for category breakdowns
            cursor = conn.execute("SELECT data_json FROM analyses")
            structural_count = 0
            semantic_count = 0
            cat_counts: Dict[str, int] = {
                "Structural Breaking": 0,
                "Behavioral Breaking (NLP)": 0,
                "Dual Breaking": 0,
                "Non-Breaking": 0
            }

            for r in cursor.fetchall():
                try:
                    d = json.loads(r["data_json"])
                    for ep in d.get("endpoints", []):
                        btype = ep.get("breaking_type", "NON_BREAKING")
                        if btype == "STRUCTURAL_BREAKING":
                            cat_counts["Structural Breaking"] += 1
                        elif btype == "BEHAVIORAL_BREAKING":
                            cat_counts["Behavioral Breaking (NLP)"] += 1
                        elif btype == "DUAL_BREAKING":
                            cat_counts["Dual Breaking"] += 1
                        else:
                            cat_counts["Non-Breaking"] += 1

                        if ep.get("structural_changes"):
                            structural_count += len(ep["structural_changes"])
                        if ep.get("semantic_drift", 0) > 0.20:
                            semantic_count += 1
                except Exception:
                    continue

            category_dist = [
                {"name": "Structural Breaking", "value": cat_counts["Structural Breaking"], "fill": "#ef4444"},
                {"name": "Behavioral Breaking (NLP)", "value": cat_counts["Behavioral Breaking (NLP)"], "fill": "#8b5cf6"},
                {"name": "Dual Breaking", "value": cat_counts["Dual Breaking"], "fill": "#ec4899"},
                {"name": "Non-Breaking", "value": cat_counts["Non-Breaking"], "fill": "#10b981"},
            ]

            breaking_dist = [
                {"name": "Breaking", "value": total_breaking, "fill": "#ef4444"},
                {"name": "Potentially Breaking", "value": total_pot_breaking, "fill": "#f59e0b"},
                {"name": "Non-Breaking", "value": total_non_breaking, "fill": "#10b981"},
            ]

            recent = self.list_analyses(limit=5)

            return DashboardStatsResponse(
                total_analyses=total_analyses,
                total_structural_changes=structural_count,
                total_semantic_changes=semantic_count,
                total_breaking_changes=total_breaking,
                total_potentially_breaking=total_pot_breaking,
                total_non_breaking=total_non_breaking,
                successful_analyses=total_analyses,
                category_distribution=category_dist,
                breaking_vs_non_breaking=breaking_dist,
                recent_analyses=recent
            )

analysis_repository = AnalysisRepository()
