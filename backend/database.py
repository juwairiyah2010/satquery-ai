"""
SatQuery AI — Database & Storage Engine (SQLite)
Manages User Accounts, User-Isolated Analyses, and Decision Reports.
"""

import sqlite3
import os
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

DB_PATH = os.environ.get("DATABASE_URL", "satquery.db")
if DB_PATH.startswith("sqlite:///"):
    DB_PATH = DB_PATH.replace("sqlite:///", "")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initializes the relational tables for users, analyses, and reports."""
    conn = get_db()
    cursor = conn.cursor()

    # 1. Users Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'Researcher',
        organization TEXT DEFAULT '',
        email_verified INTEGER DEFAULT 1,
        verification_token TEXT,
        reset_token TEXT,
        reset_token_exp REAL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_login_at TEXT
    );
    """)

    # 2. Analyses Table (User-Isolated)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS analyses (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        question TEXT NOT NULL,
        mode TEXT NOT NULL,
        intent TEXT NOT NULL,
        confidence REAL NOT NULL,
        confidence_label TEXT NOT NULL,
        headline TEXT,
        answer_summary TEXT,
        image_names TEXT,
        result_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    # 3. Reports Table (User-Isolated)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        analysis_id TEXT,
        report_ref TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        classification TEXT DEFAULT 'FOR OFFICIAL USE ONLY (FOUO)',
        authority TEXT NOT NULL,
        department_id TEXT,
        question TEXT NOT NULL,
        summary_text TEXT NOT NULL,
        report_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    # Indices
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_analyses_user ON analyses(user_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id);")

    conn.commit()
    conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# User CRUD operations
# ─────────────────────────────────────────────────────────────────────────────

def create_user(
    full_name: str,
    email: str,
    password_hash: str,
    role: str = "Researcher",
    organization: str = "",
    email_verified: bool = True,
    verification_token: Optional[str] = None
) -> Dict[str, Any]:
    conn = get_db()
    cursor = conn.cursor()
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    cursor.execute("""
    INSERT INTO users (
        id, full_name, email, password_hash, role, organization,
        email_verified, verification_token, created_at, updated_at, last_login_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id,
        full_name.strip(),
        email.strip().lower(),
        password_hash,
        role.strip() or "Researcher",
        organization.strip() or "",
        1 if email_verified else 0,
        verification_token,
        now,
        now,
        now
    ))
    conn.commit()
    conn.close()
    return get_user_by_id(user_id)


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (email.strip().lower(),))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None


def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, full_name, email, role, organization, email_verified, created_at, updated_at, last_login_at FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None


def get_user_with_password_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None


def update_last_login(user_id: str):
    conn = get_db()
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()
    cursor.execute("UPDATE users SET last_login_at = ? WHERE id = ?", (now, user_id))
    conn.commit()
    conn.close()


def update_user_profile(user_id: str, full_name: str, organization: str, role: str) -> Optional[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
    UPDATE users SET full_name = ?, organization = ?, role = ?, updated_at = ?
    WHERE id = ?
    """, (full_name.strip(), organization.strip(), role.strip(), now, user_id))
    conn.commit()
    conn.close()
    return get_user_by_id(user_id)


def update_user_password(user_id: str, password_hash: str):
    conn = get_db()
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
    UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_exp = NULL, updated_at = ?
    WHERE id = ?
    """, (password_hash, now, user_id))
    conn.commit()
    conn.close()


def set_reset_token(email: str, token: str, exp_timestamp: float):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    UPDATE users SET reset_token = ?, reset_token_exp = ? WHERE email = ?
    """, (token, exp_timestamp, email.strip().lower()))
    conn.commit()
    conn.close()


def get_user_by_reset_token(token: str) -> Optional[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE reset_token = ?", (token,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None


def verify_user_email_by_token(token: str) -> bool:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    UPDATE users SET email_verified = 1, verification_token = NULL WHERE verification_token = ?
    """, (token,))
    changed = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return changed


def delete_user_account(user_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM reports WHERE user_id = ?", (user_id,))
    cursor.execute("DELETE FROM analyses WHERE user_id = ?", (user_id,))
    cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# User Analyses CRUD operations (Strict User Isolation)
# ─────────────────────────────────────────────────────────────────────────────

def save_analysis(
    user_id: str,
    title: str,
    question: str,
    mode: str,
    intent: str,
    confidence: float,
    confidence_label: str,
    headline: str,
    answer_summary: str,
    image_names: str,
    result_dict: Dict[str, Any]
) -> Dict[str, Any]:
    conn = get_db()
    cursor = conn.cursor()
    analysis_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    cursor.execute("""
    INSERT INTO analyses (
        id, user_id, title, question, mode, intent, confidence,
        confidence_label, headline, answer_summary, image_names, result_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        analysis_id,
        user_id,
        title,
        question,
        mode,
        intent,
        confidence,
        confidence_label,
        headline,
        answer_summary,
        image_names,
        json.dumps(result_dict),
        now
    ))
    conn.commit()
    conn.close()
    return get_analysis(user_id, analysis_id)


def get_user_analyses(user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT id, user_id, title, question, mode, intent, confidence,
           confidence_label, headline, answer_summary, image_names, created_at
    FROM analyses
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
    """, (user_id, limit))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_analysis(user_id: str, analysis_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT * FROM analyses WHERE id = ? AND user_id = ?
    """, (analysis_id, user_id))
    row = cursor.fetchone()
    conn.close()
    if row:
        d = dict(row)
        if "result_json" in d:
            try:
                d["result"] = json.loads(d["result_json"])
            except Exception:
                d["result"] = None
        return d
    return None


def delete_analysis(user_id: str, analysis_id: str) -> bool:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM analyses WHERE id = ? AND user_id = ?", (analysis_id, user_id))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted


# ─────────────────────────────────────────────────────────────────────────────
# User Reports CRUD operations (Strict User Isolation)
# ─────────────────────────────────────────────────────────────────────────────

def save_report(
    user_id: str,
    title: str,
    authority: str,
    department_id: str,
    question: str,
    summary_text: str,
    report_dict: Dict[str, Any],
    analysis_id: Optional[str] = None
) -> Dict[str, Any]:
    conn = get_db()
    cursor = conn.cursor()
    report_id = str(uuid.uuid4())
    report_ref = report_dict.get("report_ref") or ('SATQ-RPT-' + str(uuid.uuid4().hex[:6]).upper())
    now = datetime.now(timezone.utc).isoformat()

    cursor.execute("""
    INSERT INTO reports (
        id, user_id, analysis_id, report_ref, title, classification,
        authority, department_id, question, summary_text, report_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        report_id,
        user_id,
        analysis_id,
        report_ref,
        title,
        report_dict.get("classification", "FOR OFFICIAL USE ONLY (FOUO)"),
        authority,
        department_id,
        question,
        summary_text,
        json.dumps(report_dict),
        now
    ))
    conn.commit()
    conn.close()
    return get_report(user_id, report_id)


def get_user_reports(user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT id, user_id, analysis_id, report_ref, title, classification,
           authority, department_id, question, summary_text, created_at
    FROM reports
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
    """, (user_id, limit))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_report(user_id: str, report_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT * FROM reports WHERE id = ? AND user_id = ?
    """, (report_id, user_id))
    row = cursor.fetchone()
    conn.close()
    if row:
        d = dict(row)
        if "report_json" in d:
            try:
                d["report"] = json.loads(d["report_json"])
            except Exception:
                d["report"] = None
        return d
    return None


def delete_report(user_id: str, report_id: str) -> bool:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM reports WHERE id = ? AND user_id = ?", (report_id, user_id))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted


def get_user_stats(user_id: str) -> Dict[str, Any]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as count FROM analyses WHERE user_id = ?", (user_id,))
    total_analyses = cursor.fetchone()["count"]

    cursor.execute("SELECT COUNT(*) as count FROM reports WHERE user_id = ?", (user_id,))
    total_reports = cursor.fetchone()["count"]

    cursor.execute("""
    SELECT mode, COUNT(*) as count FROM analyses
    WHERE user_id = ?
    GROUP BY mode
    ORDER BY count DESC
    LIMIT 1
    """, (user_id,))
    top_mode_row = cursor.fetchone()
    top_mode = top_mode_row["mode"] if top_mode_row else "optical"

    conn.close()
    return {
        "total_analyses": total_analyses,
        "total_reports": total_reports,
        "primary_modality": top_mode,
    }


# Auto-initialize on module load
init_db()
