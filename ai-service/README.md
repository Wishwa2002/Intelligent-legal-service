# AI Service — Documentation & Clerk Agentic Workflow

A **stateful, resumable, multi-step agentic AI service** built with **FastAPI + LangGraph + Gemini**.

Part of the **Intelligent Legal Service Platform** (SE3090 Group Project).

---

## What This Service Does

This AI service drives the full documentation submission and clerk assignment workflow:

1. **Identifies** the legal service the client needs (rental agreement, business registration, etc.)
2. **Checks** what documents are required (always fetched from the backend — never invented)
3. **Analyzes** each uploaded document using OCR + Gemini
4. **Validates** documents against confidence thresholds (enforced in Python, not by Gemini)
5. **Re-asks** the client with specific reasons when a document fails (up to 3 attempts)
6. **Presents a summary** of all verified documents before proceeding
7. **Recommends** a clerk (Gemini explains, admin decides — AI never assigns)
8. **Re-plans** if an admin rejects the recommendation
9. **Completes** the workflow once admin approves
10. **Handles off-topic messages** with polite redirects (workflow state never changes)

---

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Copy env template and fill in your values
cp .env.example .env
# Edit .env: add GEMINI_API_KEY, GEMINI_MODEL, BACKEND_API_URL

# 3. Install Tesseract OCR (for image documents)
# Windows: https://github.com/UB-Mannheim/tesseract/wiki
# Linux: sudo apt install tesseract-ocr

# 4. Run the service
uvicorn app.main:app --reload --port 8001

# 5. Health check
curl http://localhost:8001/health
```

---

## Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness probe — returns model name |
| `POST` | `/api/agent/chat/session` | Start a new client session |
| `POST` | `/api/agent/chat/{id}/message` | Send message or notify of file upload |
| `GET` | `/api/agent/chat/{id}/status` | Get current workflow status |
| `POST` | `/api/agent/documentation/analyze` | Programmatic workflow trigger |
| `POST` | `/api/agent/workflows/{id}/approve` | Admin approve/reject clerk |
| `GET` | `/api/agent/workflows/{id}` | Get workflow state |
| `GET` | `/api/agent/workflows/{id}/summary` | Get execution summary + audit log |

---

## Folder Structure

```
app/
├── config/settings.py          ← All thresholds and config (single source of truth)
├── api/routes/agent.py         ← All FastAPI endpoints
├── agents/
│   ├── supervisor.py           ← Orchestrator, off-topic detection
│   ├── document_analysis.py    ← Analyze node
│   ├── document_validation.py  ← Validate/accept/reject + summary nodes
│   └── clerk_recommendation.py ← Recommend + replan nodes
├── graph/
│   ├── state.py                ← AgentState TypedDict
│   ├── workflow.py             ← LangGraph StateGraph + session store
│   └── routing.py              ← Deterministic Python routing (not LLM)
├── tools/                      ← Backend API wrappers (tools called by agents)
├── services/
│   ├── backend_client.py       ← Single HTTPX client for ASP.NET backend
│   ├── gemini_service.py       ← Gemini structured output calls
│   ├── document_service.py     ← PDF/OCR extraction pipeline
│   └── ocr_service.py          ← Tesseract wrapper
├── schemas/                    ← Pydantic models
├── prompts/                    ← System prompts for each agent
├── security/
│   ├── injection_defense.py    ← Sanitizes document text before Gemini
│   └── tool_permissions.py     ← Per-node tool allowlists
└── logging/audit.py            ← Structured audit log writer
tests/
├── test_documents.py           ← Document analysis/validation loop tests
└── test_security.py            ← Injection defense + allowlist tests
```

---

## Confidence Thresholds

| Threshold | Value | Outcome |
|-----------|-------|---------|
| `HIGH_CONFIDENCE_THRESHOLD` | 0.90 | Auto-accept, continue workflow |
| `MEDIUM_CONFIDENCE_THRESHOLD` | 0.70 | Accept but flag for clerk review |
| Below medium | < 0.70 | Reject, ask client to re-upload |
| `MAX_REUPLOAD_ATTEMPTS_PER_DOCUMENT` | 3 | Exceed → escalate to human review |

All thresholds live in `.env` and are loaded via `settings.py`.
**Gemini cannot override these** — all threshold comparisons are Python `>=` operators.

---

## Security Rules

- Document content is **always sanitized** before reaching Gemini (injection defense)
- Each agent node has a **fixed tool allowlist** — out-of-scope calls raise `PermissionError`
- The AI **never assigns a clerk** — only recommends. Backend performs assignment after admin approval.
- The AI **never invents required documents** — always fetched from the backend service config.
- Secrets are **never logged or included in Gemini prompts**.

---

## Running Tests

```bash
cd ai-service
pytest tests/ -v
```

---

## Environment Variables

See [`.env.example`](.env.example) for all required variables.
