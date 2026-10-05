"""Durable workflow state through the ASP.NET Core API in cloud deployments.

Local development keeps JSON files for compatibility. Set AI_STATE_STORE=backend
in deployed services; that mode fails closed when persistence is unavailable.
"""
import json
import os
from pathlib import Path
from typing import Any

import httpx

from app.config.settings import get_settings


def _backend_url(kind: str, session_id: str | None = None) -> str:
    base = get_settings().backend_api_url.rstrip("/")
    return f"{base}/internal/ai-state/{kind}" + (f"/{session_id}" if session_id else "")


def _headers() -> dict[str, str]:
    key = get_settings().ai_service_api_key
    if not key:
        raise RuntimeError("AI_SERVICE_API_KEY is required for durable state")
    return {"X-AI-Service-Key": key}


def _remote() -> bool:
    return os.getenv("AI_STATE_STORE", "local").lower() == "backend"


def read_state(kind: str, session_id: str, directory: Path) -> dict | None:
    if _remote():
        response = httpx.get(_backend_url(kind, session_id), headers=_headers(), timeout=15)
        if response.status_code == 404:
            return None
        response.raise_for_status()
        return response.json()
    path = directory / f"{session_id}.json"
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else None


def write_state(kind: str, session_id: str, state: dict, directory: Path) -> None:
    if _remote():
        response = httpx.put(_backend_url(kind, session_id), headers=_headers(),
                             json=json.loads(json.dumps(state, default=str)), timeout=15)
        response.raise_for_status()
        return
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / f"{session_id}.json"
    path.write_text(json.dumps(state, indent=2, default=str), encoding="utf-8")


def all_states(kind: str, directory: Path) -> list[tuple[str, dict[str, Any]]]:
    if _remote():
        response = httpx.get(_backend_url(kind), headers=_headers(), timeout=20)
        response.raise_for_status()
        return [(row["sessionId"], row["state"]) for row in response.json()]
    result = []
    for path in directory.glob("*.json"):
        try:
            result.append((path.stem, json.loads(path.read_text(encoding="utf-8"))))
        except (OSError, json.JSONDecodeError):
            continue
    return result
