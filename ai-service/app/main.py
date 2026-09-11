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
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import get_settings
from app.services.backend_client import get_backend_client

logger = logging.getLogger(__name__)
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

    # ---- CORS ----
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],   # tighten in production
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ---- Routes ----
    # Import here (after app creation) to avoid circular imports
    from app.api.routes.agent import router as agent_router
    app.include_router(agent_router)

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
    from fastapi.staticfiles import StaticFiles
    import pathlib

    sample_docs_dir = pathlib.Path(__file__).parent.parent / "sample_documents"
    sample_docs_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/sample-documents", StaticFiles(directory=str(sample_docs_dir)), name="sample_documents")

    @app.get("/", response_class=HTMLResponse, include_in_schema=False)
    @app.get("/chat", response_class=HTMLResponse, include_in_schema=False)
    async def chat_ui():
        """Interactive visual playground for testing the agentic chat workflow."""
        html_path = pathlib.Path(__file__).parent / "templates" / "chat.html"
        if html_path.exists():
            return HTMLResponse(content=html_path.read_text(encoding="utf-8"))
        return HTMLResponse(content="<h1>Chat UI template not found</h1>", status_code=404)

    return app


app = create_app()
