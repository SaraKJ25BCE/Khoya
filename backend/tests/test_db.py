import os
from app.db import is_database_configured, get_db_status


def test_is_database_configured_with_placeholder(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://user:your_password@localhost:5432/khoya_db")
    assert is_database_configured() is False


def test_is_database_configured_empty(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "")
    assert is_database_configured() is False


def test_get_db_status_structure():
    status = get_db_status()
    assert isinstance(status, dict)
    assert "configured" in status
    assert "connected" in status
    assert "tables" in status
