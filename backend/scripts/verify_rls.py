#!/usr/bin/env python
"""Verify that Row Level Security (RLS) is enabled on all tables in PostgreSQL.

Fails (exit 1) if any table has RLS disabled.
When run against non-PostgreSQL databases (e.g. SQLite), prints a notice and exits cleanly.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

# Ensure backend root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text
from app.models.database import engine

REQUIRED_TABLES = [
    "cache_entries",
    "suppliers",
    "users",
    "ideas",
    "profiles",
    "reports",
    "supplier_leads",
    "chat_sessions",
    "chat_messages",
]


def check_rls() -> bool:
    if engine.dialect.name != "postgresql":
        print(f"[RLS Check] Database dialect is '{engine.dialect.name}', skipping Postgres-specific RLS verification.")
        return True

    query = text("""
        SELECT relname, relrowsecurity
        FROM pg_class
        JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
        WHERE pg_namespace.nspname = 'public'
          AND pg_class.relkind = 'r'
          AND relname = ANY(:tables);
    """)

    with engine.connect() as conn:
        rows = conn.execute(query, {"tables": REQUIRED_TABLES}).fetchall()
        table_rls = {row[0]: row[1] for row in rows}

    missing_tables = [t for t in REQUIRED_TABLES if t not in table_rls]
    disabled_rls = [t for t, rls in table_rls.items() if not rls]

    if missing_tables:
        print(f"[RLS Check ERROR] Tables missing in database: {missing_tables}")
    if disabled_rls:
        print(f"[RLS Check ERROR] Tables with RLS disabled: {disabled_rls}")

    if missing_tables or disabled_rls:
        return False

    print(f"[RLS Check SUCCESS] All {len(REQUIRED_TABLES)} application tables have RLS enabled.")
    return True


if __name__ == "__main__":
    success = check_rls()
    if not success:
        sys.exit(1)
    sys.exit(0)
