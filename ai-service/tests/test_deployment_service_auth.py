from types import SimpleNamespace

from fastapi.testclient import TestClient

import app.main as main


def test_main_ai_routes_require_backend_key(monkeypatch):
    monkeypatch.setattr(main, "get_settings", lambda: SimpleNamespace(
        ai_service_api_key="test-only-key", gemini_model="test-model", backend_api_url="http://localhost:5000"))
    with TestClient(main.app) as client:
        assert client.get("/health").status_code == 200
        assert client.get("/api/agent/request/1/status").status_code == 401
        assert client.get("/api/agent/request/1/status", headers={"X-AI-Service-Key": "wrong"}).status_code == 401
        assert client.get("/api/agent/request/1/status", headers={"X-AI-Service-Key": "test-only-key"}).status_code == 404
