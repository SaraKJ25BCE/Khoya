"""
PostgreSQL / Supabase Database Connection Layer for Khoya Python Backend.

Uses DATABASE_URL from environment variables (.env file loaded via python-dotenv).
Handles database connection pooling, query execution, and status reporting for tables
matching database/migrations/ (users, trades, trade_legs, pnl_attribution, option_chain_snapshots).
"""

import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv

# Ensure .env is loaded regardless of execution context
ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)
load_dotenv()  # Fallback to root .env if present

DATABASE_URL = os.getenv("DATABASE_URL", "")

PSYCOPG2_AVAILABLE = False
try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    PSYCOPG2_AVAILABLE = True
except ImportError:
    psycopg2 = None
    RealDictCursor = None


def is_database_configured() -> bool:
    """Returns True if DATABASE_URL is set and not a placeholder."""
    url = os.getenv("DATABASE_URL", "")
    if not url:
        return False
    placeholders = ["your_password", "[YOUR-PASSWORD]", "[PASSWORD]", "localhost:5432/khoya_db"]
    return not any(p in url for p in placeholders)


def get_db_connection():
    """Returns a new psycopg2 connection if configured."""
    if not PSYCOPG2_AVAILABLE:
        raise RuntimeError("psycopg2-binary package is not installed.")
    if not is_database_configured():
        raise ValueError("DATABASE_URL is missing or unconfigured in environment.")
    
    url = os.getenv("DATABASE_URL", "")
    return psycopg2.connect(url, cursor_factory=RealDictCursor)


def get_db_status() -> Dict[str, Any]:
    """
    Check database connectivity and table statistics matching database/migrations/.
    """
    configured = is_database_configured()
    if not configured:
        return {
            "configured": False,
            "connected": False,
            "driver": "psycopg2" if PSYCOPG2_AVAILABLE else "missing",
            "message": "DATABASE_URL is missing or unconfigured in .env file.",
            "tables": {},
        }

    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            # Query existing table names in public schema
            cur.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            """)
            tables = [row["table_name"] for row in cur.fetchall()]

            table_counts = {}
            for t in ["users", "trades", "trade_legs", "pnl_attribution", "option_chain_snapshots"]:
                if t in tables:
                    cur.execute(f"SELECT COUNT(*) as count FROM {t}")
                    table_counts[t] = cur.fetchone()["count"]
                else:
                    table_counts[t] = "table_not_found"

        conn.close()
        return {
            "configured": True,
            "connected": True,
            "driver": "psycopg2",
            "database_url_host": os.getenv("DATABASE_URL", "").split("@")[-1].split("/")[0] if "@" in os.getenv("DATABASE_URL", "") else "redacted",
            "tables": table_counts,
        }
    except Exception as e:
        return {
            "configured": True,
            "connected": False,
            "driver": "psycopg2",
            "error": str(e),
            "message": "Failed to establish PostgreSQL database connection with provided DATABASE_URL.",
            "tables": {},
        }


def fetch_all(sql: str, params: Optional[tuple] = None) -> List[Dict[str, Any]]:
    """Execute a SELECT query and return list of dictionary records."""
    if not is_database_configured():
        return []
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            rows = cur.fetchall()
            return [dict(r) for r in rows]
    finally:
        conn.close()
