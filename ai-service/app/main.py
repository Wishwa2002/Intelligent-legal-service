"""
app/main.py

FastAPI application entrypoint.

Registers all routers and exposes:
  GET  /health                     — liveness probe
  POST /api/agent/chat/session     — create chat session
  POST /api/agent/chat/{id}/message
  GET  /api/agent/chat/{id}/status
  POST /api/agent/documentation/analyze
  POST /api/agent/workflows/{id}/approve
  GET  /api/agent/workflows/{id}
  GET  /api/agent/workflows/{id}/summary
  GET  /api/agent/request/{id}/status
"""

import logging
import os
import secrets
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, Header, HTTPException

from app.config.settings import get_settings
from app.services.backend_client import get_backend_client

logger = logging.getLogger(__name__)


async def require_backend_key(x_ai_service_key: str = Header(default="")) -> None:
    expected = get_settings().ai_service_api_key
    if not expected or not secrets.compare_digest(expected, x_ai_service_key):
        raise HTTPException(status_code=401, detail="Internal authentication required")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    settings = get_settings()
    logger.info("AI Service starting — model=%s backend=%s", settings.gemini_model, settings.backend_api_url)
    yield
    # Graceful shutdown: close the HTTPX client
    client = get_backend_client()
    await client.close()
    logger.info("AI Service shut down cleanly.")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Legal Service — AI Agent",
        description=(
            "Agentic AI service for document verification, clerk recommendation, "
            "and workflow orchestration. Integrates with the ASP.NET Core backend over HTTP."
        ),
        version="1.0.0",
        lifespan=lifespan,
    )

    # ---- Routes ----
    # Import here (after app creation) to avoid circular imports
    from app.api.routes.agent import router as agent_router
    from app.api.routes.component_routes import router as component_router
    from app.api.routes.scheduling_routes import router as scheduling_router
    protected = [Depends(require_backend_key)]
    app.include_router(agent_router, dependencies=protected)
    app.include_router(component_router, dependencies=protected)
    app.include_router(scheduling_router, dependencies=protected)


    # ---- Health ----
    @app.get("/health", tags=["Health"])
    async def health():
        """
        Liveness probe.
        Returns the configured Gemini model so the caller can verify the right
        model is loaded without exposing any secrets.
        """
        return {
            "status": "ok",
            "model": settings.gemini_model,
            "backend_url": settings.backend_api_url,
        }

    # ---- Interactive Agent Chat UI ----
    from fastapi.responses import HTMLResponse
    import pathlib

    sample_docs_dir = pathlib.Path(__file__).parent.parent / "sample_documents"
    sample_docs_dir.mkdir(parents=True, exist_ok=True)
    # Sample files remain available to the agent internally, not as public URLs.

    @app.get("/", response_class=HTMLResponse, include_in_schema=False)
    @app.get("/chat", response_class=HTMLResponse, include_in_schema=False)
    async def chat_ui():
        """Interactive visual playground for testing the agentic chat workflow."""
        if os.getenv("AI_STATE_STORE", "local").lower() == "backend":
            raise HTTPException(status_code=404, detail="Not found")
        html_path = pathlib.Path(__file__).parent / "templates" / "chat.html"
        if html_path.exists():
            return HTMLResponse(content=html_path.read_text(encoding="utf-8"))
        return HTMLResponse(content="<h1>Chat UI template not found</h1>", status_code=404)

    return app


app = create_app()
