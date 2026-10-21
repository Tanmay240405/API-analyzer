import sqlite3
import json
from typing import List, Optional, Dict, Any
from backend.config import SQLITE_DB_PATH

def init_db():
    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS comparisons (
            id TEXT PRIMARY KEY,
            created_at TEXT NOT NULL,
            name TEXT,
            v1_title TEXT,
            v2_title TEXT,
            v1_version TEXT,
            v2_version TEXT,
            v1_filename TEXT,
            v2_filename TEXT,
            total_endpoints INTEGER,
            breaking_count INTEGER,
            potentially_breaking_count INTEGER DEFAULT 0,
            non_breaking_count INTEGER,
            structural_breaking_count INTEGER,
            behavioral_breaking_count INTEGER,
            structural_changes_count INTEGER DEFAULT 0,
            semantic_changes_count INTEGER DEFAULT 0,
            risk_score REAL,
            status TEXT DEFAULT 'Completed',
            result_json TEXT NOT NULL
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS evaluation_history (
            id TEXT PRIMARY KEY,
            created_at TEXT NOT NULL,
            precision_nlp REAL,
            recall_nlp REAL,
            f1_nlp REAL,
            accuracy_nlp REAL,
            precision_structural REAL,
            recall_structural REAL,
            f1_structural REAL,
            accuracy_structural REAL,
            result_json TEXT NOT NULL
        )
    """)
    
    # Auto-migrate existing SQLite table columns if created on an earlier version
    cursor.execute("PRAGMA table_info(comparisons)")
    existing_cols = {row[1] for row in cursor.fetchall()}
    cols_to_add = {
        "name": "TEXT",
        "v1_filename": "TEXT",
        "v2_filename": "TEXT",
        "potentially_breaking_count": "INTEGER DEFAULT 0",
        "structural_changes_count": "INTEGER DEFAULT 0",
        "semantic_changes_count": "INTEGER DEFAULT 0",
        "status": "TEXT DEFAULT 'Completed'"
    }
    for col, col_type in cols_to_add.items():
        if col not in existing_cols:
            try:
                cursor.execute(f"ALTER TABLE comparisons ADD COLUMN {col} {col_type}")
            except Exception:
                pass
    conn.commit()
    conn.close()

# Auto-initialize on module load
init_db()

def save_comparison(comp_data: Dict[str, Any]) -> str:
    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO comparisons (
            id, created_at, name, v1_title, v2_title, v1_version, v2_version,
            v1_filename, v2_filename,
            total_endpoints, breaking_count, potentially_breaking_count, non_breaking_count,
            structural_breaking_count, behavioral_breaking_count,
            structural_changes_count, semantic_changes_count,
            risk_score, status, result_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        comp_data["id"],
        comp_data["created_at"],
        comp_data.get("name") or comp_data.get("v1_title", "API Comparison"),
        comp_data.get("v1_title", ""),
        comp_data.get("v2_title", ""),
        comp_data.get("v1_version", ""),
        comp_data.get("v2_version", ""),
        comp_data.get("v1_filename", "api_v1.yaml"),
        comp_data.get("v2_filename", "api_v2.yaml"),
        comp_data.get("total_endpoints", 0),
        comp_data.get("breaking_count", 0),
        comp_data.get("potentially_breaking_count", 0),
        comp_data.get("non_breaking_count", 0),
        comp_data.get("structural_breaking_count", 0),
        comp_data.get("behavioral_breaking_count", 0),
        comp_data.get("structural_changes_count", 0),
        comp_data.get("semantic_changes_count", 0),
        comp_data.get("risk_score", 0.0),
        "Completed",
        json.dumps(comp_data)
    ))
    conn.commit()
    conn.close()
    return comp_data["id"]

def get_comparison(comp_id: str) -> Optional[Dict[str, Any]]:
    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT result_json FROM comparisons WHERE id = ?", (comp_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return json.loads(row[0])
    return None

def list_comparisons(limit: int = 50) -> List[Dict[str, Any]]:
    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, created_at, name, v1_title, v2_title, v1_version, v2_version,
               v1_filename, v2_filename, total_endpoints, breaking_count,
               potentially_breaking_count, non_breaking_count, risk_score, status
        FROM comparisons
        ORDER BY created_at DESC
        LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    
    return [
        {
            "id": r[0],
            "created_at": r[1],
            "name": r[2] or f"{r[3]} ({r[5]} -> {r[6]})",
            "v1_title": r[3],
            "v2_title": r[4],
            "v1_version": r[5],
            "v2_version": r[6],
            "v1_filename": r[7] or "api_v1.yaml",
            "v2_filename": r[8] or "api_v2.yaml",
            "total_endpoints": r[9],
            "breaking_count": r[10],
            "potentially_breaking_count": r[11],
            "non_breaking_count": r[12],
            "risk_score": r[13],
            "status": r[14] or "Completed"
        }
        for r in rows
    ]

def delete_comparison(comp_id: str) -> bool:
    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM comparisons WHERE id = ?", (comp_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

def get_dashboard_stats() -> Dict[str, Any]:
    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT result_json FROM comparisons")
    rows = cursor.fetchall()
    conn.close()

    total_analyses = len(rows)
    total_structural = 0
    total_semantic = 0
    total_breaking = 0
    total_potentially = 0
    total_non_breaking = 0
    category_counts = {
        "STRUCTURAL_BREAKING": 0,
        "BEHAVIORAL_BREAKING": 0,
        "DUAL_BREAKING": 0,
        "NON_BREAKING": 0,
        "UNCHANGED": 0
    }

    for (r_json,) in rows:
        try:
            data = json.loads(r_json)
            total_structural += data.get("structural_changes_count", 0)
            total_semantic += data.get("semantic_changes_count", 0)
            total_breaking += data.get("breaking_count", 0)
            total_potentially += data.get("potentially_breaking_count", 0)
            total_non_breaking += data.get("non_breaking_count", 0)
            for k, v in data.get("category_breakdown", {}).items():
                category_counts[k] = category_counts.get(k, 0) + v
        except Exception:
            pass

    category_dist = [
        {"name": "Structural Breaking", "value": category_counts["STRUCTURAL_BREAKING"], "fill": "#ef4444"},
        {"name": "Behavioral Breaking (NLP)", "value": category_counts["BEHAVIORAL_BREAKING"], "fill": "#8b5cf6"},
        {"name": "Dual Breaking", "value": category_counts["DUAL_BREAKING"], "fill": "#ec4899"},
        {"name": "Non-Breaking", "value": category_counts["NON_BREAKING"], "fill": "#10b981"},
    ]

    breaking_dist = [
        {"name": "Breaking", "value": total_breaking, "fill": "#ef4444"},
        {"name": "Potentially Breaking", "value": total_potentially, "fill": "#f59e0b"},
        {"name": "Non-Breaking", "value": total_non_breaking, "fill": "#10b981"}
    ]

    recent = list_comparisons(limit=5)

    return {
        "total_analyses": total_analyses,
        "total_structural_changes": total_structural,
        "total_semantic_changes": total_semantic,
        "total_breaking_changes": total_breaking,
        "total_potentially_breaking": total_potentially,
        "total_non_breaking": total_non_breaking,
        "successful_analyses": total_analyses,
        "category_distribution": category_dist,
        "breaking_vs_non_breaking": breaking_dist,
        "recent_analyses": recent
    }
