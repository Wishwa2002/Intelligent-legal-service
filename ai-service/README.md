# AI Service — Document & Clerk Agent (Agentic AI)

A **stateful, resumable, multi-agent workflow** built with **FastAPI + LangGraph + Google Gemini + Chroma + BM25**.

Part of the **Intelligent Legal Service Platform** (SE3090 Group Project).

---

## 1. System Architecture

```text
                    Customer
                       │
                       │ Upload documents
                       ▼
                React / Flutter
                       │
                       ▼
              ASP.NET Core Backend
                       │
                       │ REST API (HTTPX)
                       ▼
              Python AI Service
                       │
                       ▼
             Document & Clerk Agent
                       │
          ┌────────────┴─────────────┐
          ▼                          ▼
  Document Processing          Backend Tools
          │                          │
          ▼                          ▼
   OCR / Extraction          Services / Clerks
          │
          ▼
  Document Classification
          │
          ▼
  Requirement Retrieval
          │
          ▼
     Hybrid RAG
     ┌────┴────┐
    BM25     Chroma
     └────┬────┘
          ▼
         RRF
          │
          ▼
   Retrieval Grader
          │
      ┌───┴───┐
   Relevant  Not Relevant
      │          │
      │          ▼
      │     Query Rewrite
      │          │
      │          ▼
      │       Retrieve (max 2 retries)
      │          │
      └───┬──────┘
          │
          ▼
Missing Document Detection
          │
          ▼
Clerk Recommendation (Transparent Multi-Factor Scoring)
          │
          ▼
Human Approval Gate (LangGraph Interrupt)
          │
   ┌──────┼──────┐
Approve Modify Reject
   └──────┬──────┘
          │
          ▼
    Backend Update
          │
          ▼
     Audit Trail
          │
          ▼
         END
```

---

## 2. Lab 06 Concept Mapping

This component demonstrates the following **Lab 06** agentic design patterns and concepts:

| Lab 06 Concept | My Component Implementation |
| :--- | :--- |
| **Router** | `app/agents/router.py` (`DocumentIntent` structured routing) |
| **Tool** | `app/tools/*` (`service_tools`, `clerk_tools`, `request_tools`, `approval_tools`, `document_tools`) |
| **Chroma** | `app/retrieval/chroma.py` (semantic vector retrieval using ChromaDB collections) |
| **BM25** | `app/retrieval/bm25.py` (lexical keyword retrieval via `rank_bm25.BM25Okapi`) |
| **RRF** | `app/retrieval/rrf.py` (Reciprocal Rank Fusion combination: $RRF = \sum \frac{1}{60 + \text{rank}}$) |
| **Grade** | `app/agents/retrieval_agent.py` (`RetrievalGrade` evaluation of requirement checklists) |
| **Rewrite** | `app/agents/retrieval_agent.py` (`rewrite_query_node` query optimization) |
| **Retrieve $\rightarrow$ Grade $\rightarrow$ Rewrite $\rightarrow$ Retrieve** | Self-correction loop with retry cap ($\le 2$) preventing infinite loops |
| **Typed State** | `app/graph/state.py` (`AgentState` TypedDict single source of truth) |
| **`add_messages`** | `messages` list with role, content, action options, and timestamps |
| **`thread_id`** | Durable session/case thread ID tracked in persistence store and HTTP routes |
| **Checkpointer** | Disk/memory state persistence (`data/sessions/{sessionId}.json`) |
| **`interrupt()`** | `app/agents/human_gate.py` (`human_gate_node` pauses execution before clerk assignment) |
| **`Command(resume)`** | `process_human_decision` (`APPROVE`, `MODIFY`, `REJECT` resumption) |
| **FastAPI** | Async REST API with OpenAPI/Swagger docs (`app/main.py`) |

---

## 3. Endpoints Overview

### Agent & Workflow Endpoints
| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Health & model liveness probe |
| `POST` | `/documents/analyze` | Standalone document extraction, OCR, & classification |
| `POST` | `/documents/check-completeness` | Authoritative required vs provided document check |
| `POST` | `/clerk/recommend` | Transparent multi-factor clerk recommendation |
| `POST` | `/agent/ask` | Hybrid retrieval + grading + legal assistance |
| `POST` | `/agent/resume` | Resume paused workflow with Approve, Modify, or Reject |
| `GET` | `/threads/{thread_id}` | Retrieve case state & audit trail from checkpoint |
| `GET` | `/search` | Direct Hybrid Search (BM25 + Chroma + RRF) |

### Existing Client Chat Endpoints (Preserved)
| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/api/agent/chat/session` | Start new client chat session |
| `POST` | `/api/agent/chat/{id}/message` | Send message or file upload notification |
| `GET` | `/api/agent/chat/{id}/status` | Get current workflow phase & missing documents |
| `POST` | `/api/agent/workflows/{id}/approve` | Admin approval/rejection endpoint |
| `GET` | `/api/agent/workflows/{id}/summary` | Execution summary & audit log |

---

## 4. Confidence Thresholds & Guardrails

| Threshold | Value | Outcome |
| :--- | :--- | :--- |
| `HIGH_CONFIDENCE_THRESHOLD` | 0.90 | Auto-accept, continue workflow |
| `MEDIUM_CONFIDENCE_THRESHOLD` | 0.70 | Accept but flag for clerk review |
| Below medium | < 0.70 | Reject, ask client to re-upload with specific reasons |
| `MAX_REUPLOAD_ATTEMPTS` | 3 | Exceeded $\rightarrow$ Escalate to Human Review |
| `MAX_RETRIEVAL_RETRIES` | 2 | Exceeded $\rightarrow$ `INSUFFICIENT_INFORMATION` |

---

## 5. Running the AI Service & Tests

```bash
# 1. Navigate to AI service
cd ai-service

# 2. Run full test suite (44 tests covering all 20 scenarios)
pytest tests/ -v

# 3. Start the service
uvicorn app.main:app --reload --port 8001
```

---

## 6. Demonstration Scenario for Presentation

1. **Customer Submits Request**: Client asks for "Property Transfer".
2. **Hybrid Retrieval**: BM25 and Chroma retrieve the official document checklist using RRF.
3. **Retrieval Grader**: Evaluates if the checklist is sufficient (demonstrating query rewrite if vague).
4. **Customer Uploads Initial Documents**: Client uploads `01_nic.jpg` (OCR), `02_property_deed.pdf` (PyMuPDF), and `03_application_form.pdf`.
5. **Missing Document Check**: Compares required documents vs. uploaded documents $\rightarrow$ identifies `SALE_AGREEMENT` as missing.
6. **Stateful Pause**: Agent sets phase to `WAITING_FOR_DOCUMENTS` and provides an upload button.
7. **Customer Uploads Missing Document**: `SALE_AGREEMENT` received and verified $\rightarrow$ case completeness becomes `READY_FOR_ASSIGNMENT`.
8. **Transparent Clerk Recommendation**: Calculates match scores for candidate clerks based on Specialization (40%), Skills (25%), Workload (25%), and Experience (10%).
9. **Human Approval Gate**: Workflow pauses before assignment (`ADMIN_APPROVAL_PENDING`).
10. **Manager Decision**: Manager can:
    - **`APPROVE`**: Assigns recommended clerk.
    - **`MODIFY`**: Overrides and selects alternative clerk (recorded as `HUMAN_MODIFIED_AI_RECOMMENDATION`).
    - **`REJECT`**: Rejects recommendation and triggers replanning.
11. **Backend Synchronization & Audit**: Updates ASP.NET backend database and logs structured audit events.
