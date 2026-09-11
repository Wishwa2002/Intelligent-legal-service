"""
app/api/routes/agent.py

All FastAPI route handlers for the AI agent service.

Endpoints must match exactly what AgentIntegrationService.cs calls:
  POST /api/agent/chat/session
  POST /api/agent/chat/{sessionId}/message
  GET  /api/agent/chat/{sessionId}/status
  POST /api/agent/documentation/analyze
  POST /api/agent/workflows/{workflowId}/approve
  GET  /api/agent/workflows/{workflowId}
  GET  /api/agent/workflows/{workflowId}/summary
  GET  /api/agent/request/{requestId}/status
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from app.agents.supervisor import handle_off_topic_or_route, understand_request_node
from app.graph.state import AgentState
from app.services.backend_client import get_backend_client
from app.graph.workflow import (
    create_session,
    get_state,
    record_admin_decision_and_resume,
    run_workflow,
    save_state,
    start_document_analysis,
)
from app.schemas.agent import (
    AgentAnalysisResponse,
    AgentApprovalResponse,
    ChatSessionStatusResponse,
    CreateChatSessionRequest,
    CreateChatSessionResponse,
    SendChatMessageRequest,
    SendChatMessageResponse,
    SubmitApprovalRequest,
    TriggerAnalysisRequest,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/agent", tags=["Agent"])


# ============================================================
# Chat Session
# ============================================================

@router.post("/chat/session", response_model=CreateChatSessionResponse)
async def create_chat_session(request: CreateChatSessionRequest):
    """
    Create a new stateful AI chat session for a customer.
    Called by AgentIntegrationService.cs CreateChatSessionAsync().
    """
    customer_id = str(request.customer_id)
    session_id, state = create_session(customer_id=customer_id)

    # Run the initial understand_request node to greet the client
    updated = await understand_request_node(state)
    save_state(session_id, updated)

    greeting = _last_agent_message(updated)
    action_opts = _last_action_options(updated)

    return CreateChatSessionResponse(
        session_id=session_id,
        customer_id=customer_id,
        status="ACTIVE",
        message=greeting,
        phase=updated["phase"],
        action_options=action_opts,
        messages=updated.get("messages", []),
    )


@router.post("/chat/{session_id}/message", response_model=SendChatMessageResponse)
async def send_chat_message(session_id: str, request: SendChatMessageRequest):
    """
    Send a message or document upload notification.
    Called by AgentIntegrationService.cs SendChatMessageAsync().

    If uploaded_file_id is set: triggers document analysis loop.
    If message is a text message: handles off-topic check, then routes.
    """
    state = get_state(session_id)
    if state is None:
        # Gracefully auto-initialize session if reloaded or testing directly in Swagger
        logger.info("Session '%s' not found in memory; auto-initializing.", session_id)
        _, state = create_session(customer_id="1", session_id=session_id)

    # Ensure backend request_id is initialized if service is known
    if not state.get("request_id") and state.get("service_id"):
        from app.tools.request_tools import create_request
        raw_cid = str(state.get("customer_id", "1")).strip()
        cid_int = int(raw_cid) if raw_cid.isdigit() and int(raw_cid) > 0 else 1
        req_res = await create_request(cid_int, state["service_id"])
        if req_res:
            state["request_id"] = req_res.get("requestId") or req_res.get("request_id")
            save_state(session_id, state)

    # ---- Case 1: Document uploaded ----
    file_id_raw = (request.uploaded_file_id or "").strip()
    is_file_upload = bool(file_id_raw) and file_id_raw.lower() not in ("string", "null", "none", "undefined")

    # If file_id wasn't explicitly set, detect if message text indicates a document upload or attachment
    if not is_file_upload:
        msg_lower = request.message.lower()
        if (
            "uploaded document:" in msg_lower
            or "attached sample:" in msg_lower
            or "attached:" in msg_lower
            or "📎" in request.message
            or (request.uploaded_file_expected_type and ("upload" in msg_lower or "attach" in msg_lower))
        ):
            is_file_upload = True
            file_id_raw = "1"

    if is_file_upload:
        raw_cid = str(state.get("customer_id", "")).strip().lower()
        if raw_cid == "client-default":
            state["customer_id"] = "1"
            raw_cid = "1"
            save_state(session_id, state)

        if not raw_cid or raw_cid in ("guest", "anonymous", "unauthenticated", "none", "null"):
            msg = "🔒 **Sign In Required**: Guest users cannot upload documents. Please sign in to your client account to upload and verify legal documents."
            return SendChatMessageResponse(
                message=msg,
                phase=state.get("phase", "UNDERSTAND_REQUEST"),
                missing_documents=state.get("required_documents", []),
                requires_action="LOGIN_REQUIRED",
                messages=state.get("messages", []),
            )

        try:
            file_id = int(file_id_raw)
        except (ValueError, TypeError):
            # Try treating it as a hash of the GUID
            file_id = abs(hash(file_id_raw)) % 1_000_000

        expected_type = request.uploaded_file_expected_type
        if expected_type and expected_type.strip().lower() in ("string", "null", "none"):
            expected_type = None

        # Infer expected_type from message text if not provided (e.g. "I uploaded document: Original_Contract.pdf")
        if not expected_type:
            msg_txt = request.message
            for req_doc in state.get("required_documents", []):
                req_norm = req_doc.lower().replace(" ", "_")
                req_words = [w.lower() for w in req_doc.split()]
                if (
                    req_doc.lower() in msg_txt.lower()
                    or req_norm in msg_txt.lower()
                    or all(w in msg_txt.lower() for w in req_words)
                ):
                    expected_type = req_doc
                    break

        expected_type = expected_type or _next_expected_doc_type(state)

        try:
            updated = await start_document_analysis(
                session_id=session_id,
                file_id=file_id,
                expected_doc_type=expected_type or "",
            )
        except Exception as e:
            logger.error("Document analysis failed: %s", e)
            raise HTTPException(status_code=500, detail="Document analysis failed.")

        agent_message = _last_agent_message(updated)
        analysis_data = _last_document_analysis(updated)
        missing = _missing_documents(updated)

        action_opts = _last_action_options(updated)
        if not action_opts:
            if missing:
                action_opts = [f"📄 Upload {m}" for m in missing]
            else:
                action_opts = ["📋 Go to My Requests", "📁 View All Services"]

        return SendChatMessageResponse(
            message=agent_message,
            phase=updated["phase"],
            awaiting_input=updated["phase"] in ("WAITING_FOR_DOCUMENTS", "ANALYZING"),
            awaiting_input_type="FILE" if missing else "TEXT",
            request_id=str(updated.get("request_id")) if updated.get("request_id") else None,
            missing_documents=missing,
            document_analysis=analysis_data,
            workflow_id=updated.get("workflow_id"),
            client_name=updated.get("client_name"),
            action_options=action_opts,
            messages=updated.get("messages", []),
        )

    # ---- Case 2: Text message ----
    message_text = request.message.strip()
    if not message_text:
        return SendChatMessageResponse(
            message="I didn't receive any message. Please type your request.",
            phase=state["phase"],
            awaiting_input=True,
            client_name=state.get("client_name"),
            messages=state.get("messages", []),
        )

    # Add client message to state
    state = dict(state)
    state["messages"].append({
        "role": "client",
        "content": message_text,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    save_state(session_id, state)

    # Off-topic check BEFORE any routing
    updated_state, is_relevant = await handle_off_topic_or_route(state, message_text)
    save_state(session_id, updated_state)

    if not is_relevant:
        redirect = _last_agent_message(updated_state)
        return SendChatMessageResponse(
            message=redirect,
            phase=updated_state["phase"],
            awaiting_input=True,
            awaiting_input_type="FILE" if _missing_documents(updated_state) else "TEXT",
            request_id=str(updated_state.get("request_id")) if updated_state.get("request_id") else None,
            missing_documents=_missing_documents(updated_state),
            workflow_id=updated_state.get("workflow_id"),
            client_name=updated_state.get("client_name"),
            messages=updated_state.get("messages", []),
        )

    # Relevant message — run workflow from current phase
    try:
        if updated_state["phase"] == "UNDERSTAND_REQUEST":
            final = await understand_request_node(updated_state)
            save_state(session_id, final)
        else:
            final = await run_workflow(session_id)
    except Exception as e:
        logger.error("Workflow run failed: %s", e)
        raise HTTPException(status_code=500, detail="Workflow execution error.")

    action_opts = _last_action_options(final)
    if not action_opts:
        missing = _missing_documents(final)
        if missing:
            action_opts = [f"📄 Upload {m}" for m in missing]

    return SendChatMessageResponse(
        message=_last_agent_message(final),
        phase=final["phase"],
        awaiting_input=final["phase"] not in ("COMPLETED", "ERROR"),
        awaiting_input_type="FILE" if _missing_documents(final) else "TEXT",
        request_id=str(final.get("request_id")) if final.get("request_id") else None,
        missing_documents=_missing_documents(final),
        document_analysis=_last_document_analysis(final),
        workflow_id=final.get("workflow_id"),
        client_name=final.get("client_name"),
        action_options=action_opts,
        messages=final.get("messages", []),
    )


@router.get("/chat/{session_id}/status", response_model=ChatSessionStatusResponse)
async def get_chat_session_status(session_id: str):
    """
    Returns current workflow state for the frontend.
    Called by AgentIntegrationService.cs GetChatSessionStatusAsync().
    """
    state = get_state(session_id)
    if state is None:
        # Gracefully auto-initialize session if reloaded or testing directly in Swagger
        _, state = create_session(customer_id="1", session_id=session_id)

    statuses = state.get("document_statuses", {})
    provided = [dt for dt, ds in statuses.items() if ds.get("status") in ("accepted", "accepted_with_flag")]
    missing = _missing_documents(state)

    last_msg = _last_agent_message(state)

    return ChatSessionStatusResponse(
        session_id=session_id,
        customer_id=state.get("customer_id", "client-default"),
        phase=state.get("phase", "UNDERSTAND_REQUEST"),
        request_id=str(state.get("request_id")) if state.get("request_id") else None,
        workflow_id=state.get("workflow_id"),
        client_name=state.get("client_name"),
        service_name=state.get("service_name"),
        required_documents=state.get("required_documents", []),
        provided_documents=provided,
        missing_documents=missing,
        approval_status=state.get("last_admin_decision") or "",
        recommended_clerk_id=state.get("recommended_clerk_id"),
        recommended_clerk_name=state.get("recommended_clerk_name"),
        last_activity=(last_msg[:120] if last_msg else "") or "",
        messages=state.get("messages", []),
    )


def _document_matches(file_name: str, req_doc: str) -> bool:
    """
    Robust semantic matching between an uploaded file and a required document.
    Handles filename variations such as NIC_Copy.pdf matching Testator NIC, Landlord NIC, etc.
    """
    if not file_name or not req_doc:
        return False
    import re, os
    base_name = os.path.splitext(file_name)[0]
    clean_fn = re.sub(r"[^a-zA-Z0-9\s]", " ", base_name).lower()
    clean_req = re.sub(r"[^a-zA-Z0-9\s]", " ", req_doc).lower()

    if clean_fn == clean_req or clean_req in clean_fn or clean_fn in clean_req:
        return True

    fn_words = set(clean_fn.split())
    req_words = set(clean_req.split())

    # Key document categories: if both share any primary category keyword, they match
    key_categories = [
        "nic", "identity", "deed", "affidavit", "will", "agreement", "contract",
        "ownership", "asset", "witness", "amendment", "letter", "license", "passport", "lease"
    ]
    for cat in key_categories:
        if cat in fn_words and cat in req_words:
            return True

    # Check non-stopword overlap
    stopwords = {"copy", "scan", "scanned", "draft", "document", "doc", "file", "uploaded", "pdf", "jpg", "png", "the", "of", "for", "proof", "details"}
    sig_fn = fn_words - stopwords
    sig_req = req_words - stopwords
    if sig_fn and sig_req:
        if any(f in sig_req or any(r in f for r in sig_req) for f in sig_fn):
            return True

    return False


@router.get("/chat/{session_id}/messages")
async def get_chat_messages(session_id: str):
    """
    Returns the complete chronological message history for a chat session.
    Accepts session_id, workflow_id, or numeric request_id.
    """
    state = get_state(session_id)
    if state is None:
        # 1. Try finding by workflow_id
        resolved_sid = _find_session_by_workflow_id(session_id)
        if resolved_sid:
            state = get_state(resolved_sid)
            session_id = resolved_sid

    if state is None and session_id.isdigit():
        # 2. Try finding by request_id
        rid = int(session_id)
        best_msg_count = -1
        for sid, s in _all_states():
            if s.get("request_id") == rid:
                mc = len(s.get("messages", []))
                if mc > best_msg_count:
                    best_msg_count = mc
                    state = s
                    session_id = sid

    if state is None:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")

    return {
        "session_id": session_id,
        "workflow_id": state.get("workflow_id"),
        "phase": state.get("phase", "UNDERSTAND_REQUEST"),
        "client_name": state.get("client_name"),
        "messages": state.get("messages", []),
    }


@router.post("/chat/{session_id}/upload", response_model=SendChatMessageResponse)
async def upload_chat_document(
    session_id: str,
    file: UploadFile | None = File(None),
    doc_type: str | None = Form(None),
    scenario: str | None = Form("valid"),
):
    """
    Direct document upload endpoint (accepts real PDF/image files or simulated test scenarios).
    Analyzes document text with OCR/PyMuPDF + Gemini, updates validation state,
    and returns the agent's real response and next required steps.
    """
    state = get_state(session_id)
    if state is None:
        _, state = create_session(customer_id="1", session_id=session_id)

    # 1. Determine target document type
    target_type = doc_type
    if not target_type or target_type.strip().lower() in ("string", "null", "none", ""):
        # Find first pending or rejected document
        for req_type, ds in state.get("document_statuses", {}).items():
            if ds.get("status") in ("pending", "rejected"):
                target_type = req_type
                break

    # If no service or documents yet, fallback to "NIC"
    if not target_type:
        target_type = "NIC"
        if target_type not in state.get("document_statuses", {}):
            state.setdefault("required_documents", []).append(target_type)
            state.setdefault("document_statuses", {})[target_type] = {
                "doc_type": target_type,
                "file_id": 1,
                "status": "pending",
                "retry_count": 0,
                "last_analysis": None,
                "rejection_reason": None,
            }

    if target_type not in state.get("document_statuses", {}):
        state["document_statuses"][target_type] = {
            "doc_type": target_type,
            "file_id": 1,
            "status": "pending",
            "retry_count": 0,
            "last_analysis": None,
            "rejection_reason": None,
        }

    # 2. Extract or generate bytes
    raw_bytes = b""
    content_type = "application/pdf"
    file_label = ""

    if file and file.filename:
        raw_bytes = await file.read()
        content_type = file.content_type or "application/pdf"
        file_label = file.filename
    else:
        # Simulated test scenarios
        scenario_clean = (scenario or "valid").lower().strip()
        if scenario_clean == "blurry":
            file_label = f"Simulated {target_type} (Blurry Scan)"
            raw_bytes = f"BLURRY SCAN OF {target_type.upper()}... [TEXT FADED AND UNREADABLE] ... illegible text ...".encode()
            content_type = "text/plain"
        elif scenario_clean == "wrong_type":
            file_label = f"Simulated {target_type} (Wrong Document)"
            raw_bytes = b"CEB ELECTRICITY UTILITY BILL\nAccount: 99887766\nBilling Month: August 2026\nAmount: 3,500 LKR\nDue Date: 2026-09-15"
            content_type = "text/plain"
        else:
            file_label = f"Simulated {target_type} (Valid)"
            raw_bytes = (
                f"OFFICIAL LEGAL DOCUMENT: {target_type.upper()}\n"
                f"Document Type: {target_type}\n"
                f"Applicant / Document Holder: Jane Doe\n"
                f"Registration / Document ID: 199512345678\n"
                f"Date of Execution: 2024-01-15\n"
                f"Issuing Authority: Department of Registrar & Notary Public\n"
                f"Terms & Covenants: All official clauses, conditions, and required provisions for {target_type} are fully specified and executed.\n"
                f"Signatures: Formally signed and sealed by the authorized parties and witnesses.\n"
                f"Legal Status: Verified, authentic, certified, and legally binding document."
            ).encode()
            content_type = "text/plain"

    # Add client message to chat
    state = dict(state)
    initial_msg_count = len(state.get("messages", []))
    state["messages"].append({
        "role": "client",
        "content": f"📎 Uploaded document: **{target_type}** ({file_label})",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    # Ensure a backend documentation request exists
    if not state.get("request_id"):
        from app.tools.request_tools import create_request
        service_id = state.get("service_id") or 1
        req = await create_request(customer_id=1, service_id=service_id)
        if req:
            state["request_id"] = req.get("requestId") or req.get("request_id")

    # Persist the file on the ASP.NET Core backend so it appears in the Admin Dashboard
    req_id = state.get("request_id")
    if req_id and raw_bytes:
        from app.services.backend_client import get_backend_client
        backend = get_backend_client()
        uploaded_file_res = await backend.upload_document_file(
            request_id=req_id,
            filename=file_label or f"{target_type}.pdf",
            content=raw_bytes,
            content_type=content_type,
        )
        if uploaded_file_res and uploaded_file_res.get("fileId"):
            state["document_statuses"][target_type]["file_id"] = uploaded_file_res["fileId"]

    # Run direct analysis
    from app.services.document_service import analyze_document_bytes
    from app.agents.document_validation import document_validation_node

    analysis = await analyze_document_bytes(
        raw_bytes=raw_bytes,
        content_type=content_type,
        expected_doc_type=target_type,
        session_id=session_id,
        file_id=state["document_statuses"][target_type].get("file_id") or 101,
    )

    state["document_statuses"][target_type]["status"] = "analyzing"
    state["document_statuses"][target_type]["last_analysis"] = analysis.model_dump()
    save_state(session_id, state)

    # Run validation node
    validated_state = await document_validation_node(state)
    save_state(session_id, validated_state)

    # Check completeness
    from app.agents.document_validation import check_document_completeness
    completed_state = await check_document_completeness(validated_state)
    save_state(session_id, completed_state)

    if completed_state["phase"] == "DOCUMENTS_COMPLETE":
        # Generate summary and recommend clerk directly without re-triggering understand_request
        from app.agents.document_validation import generate_document_summary
        from app.agents.clerk_recommendation import clerk_recommendation_node
        summary_state = await generate_document_summary(completed_state)
        final_state = await clerk_recommendation_node(summary_state)
    else:
        final_state = completed_state

    # Update backend file status if accepted
    if req_id and final_state["document_statuses"].get(target_type, {}).get("status") in ("accepted", "accepted_with_flag"):
        bf_id = final_state["document_statuses"][target_type].get("file_id")
        if bf_id and isinstance(bf_id, int):
            try:
                from app.services.backend_client import get_backend_client
                await get_backend_client().update_file_status(bf_id, "Accepted")
            except Exception:
                pass

    save_state(session_id, final_state)

    # Collect all agent messages generated in this upload cycle
    new_agent_messages = [
        m.get("content") for m in final_state.get("messages", [])[initial_msg_count:]
        if m.get("role") == "agent" and m.get("content")
    ]
    if new_agent_messages:
        agent_message = "\n\n---\n\n".join(new_agent_messages)
    else:
        agent_message = _last_agent_message(final_state)
    missing = _missing_documents(final_state)

    return SendChatMessageResponse(
        message=agent_message,
        phase=final_state["phase"],
        awaiting_input=final_state["phase"] in ("WAITING_FOR_DOCUMENTS", "ANALYZING"),
        awaiting_input_type="FILE" if missing else "TEXT",
        request_id=str(final_state.get("request_id")) if final_state.get("request_id") else None,
        missing_documents=missing,
        document_analysis=analysis.model_dump(),
        workflow_id=final_state.get("workflow_id"),
        messages=final_state.get("messages", []),
    )


# ============================================================
# Documentation Analyze (programmatic trigger)
# ============================================================

@router.post("/documentation/analyze", response_model=AgentAnalysisResponse)
async def analyze_documentation_request(request: TriggerAnalysisRequest):
    """
    Programmatic workflow trigger (non-chat path).
    Called by AgentIntegrationService.cs AnalyzeDocumentationRequestAsync().
    Audits required vs uploaded documents and generates intelligent clerk recommendation.
    """
    customer_id = str(request.customer_id)
    session_id, state = create_session(customer_id=customer_id)

    if request.request_id:
        state["request_id"] = request.request_id

    # Pre-populate objective as client message
    state["messages"].append({
        "role": "client",
        "content": request.objective,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    backend = get_backend_client()
    doc_req = None
    if request.request_id:
        try:
            doc_req = await backend.get_documentation_request(request.request_id)
            if doc_req:
                state["service_id"] = doc_req.get("serviceId")
                state["service_name"] = doc_req.get("serviceName") or state.get("service_name")
                state["required_documents"] = doc_req.get("requiredDocuments", [])

                # Pre-populate document_statuses
                for req_doc in state["required_documents"]:
                    state["document_statuses"][req_doc] = {
                        "status": "pending",
                        "retry_count": 0,
                        "file_id": None,
                    }

                # Match uploaded files to required docs
                for f in doc_req.get("documentFiles", []):
                    fn = f.get("fileName", "")
                    fid = f.get("fileId")
                    for req_doc in state["required_documents"]:
                        clean_fn = fn.lower().replace("_", " ").replace("-", " ")
                        clean_req = req_doc.lower().replace("_", " ").replace("-", " ")
                        if clean_req in clean_fn or clean_fn in clean_req:
                            state["document_statuses"][req_doc] = {
                                "status": "accepted",
                                "retry_count": 0,
                                "file_id": fid,
                                "file_name": fn,
                                "confidence": 0.98,
                                "attempts": 1,
                            }
        except Exception as e:
            logger.warning("Failed to fetch doc_req %s from backend: %s", request.request_id, e)

    if not state.get("service_name"):
        try:
            state = await understand_request_node(state)
        except Exception as e:
            logger.error("understand_request_node failed: %s", e)

    # Run clerk recommendation node
    from app.agents.clerk_recommendation import clerk_recommendation_node
    from app.tools.clerk_tools import get_eligible_clerks

    try:
        updated = await clerk_recommendation_node(state)
        save_state(session_id, updated)
    except Exception as e:
        logger.error("clerk_recommendation_node failed: %s", e)
        return AgentAnalysisResponse(
            status="ERROR",
            errors=[str(e)],
        )

    # Retrieve candidates for alternative clerks
    candidates = await get_eligible_clerks(exclude_clerk_ids=updated.get("excluded_clerk_ids", []))
    matched_clerk = next((c for c in candidates if c.clerk_id == updated.get("recommended_clerk_id")), None)

    # Determine missing vs submitted documents
    missing = [
        d for d in updated.get("required_documents", [])
        if updated.get("document_statuses", {}).get(d, {}).get("status") not in ("accepted", "accepted_with_flag")
    ]
    submitted = [f.get("fileName", "") for f in (doc_req.get("documentFiles", []) if doc_req else [])]

    alt_clerks = [
        {
            "clerk_id": c.clerk_id,
            "clerk_name": c.name,
            "department": c.department,
            "contact": c.contact,
            "current_workload": c.active_request_count,
            "max_workload": 10,
            "matching_score": 0.85,
            "selection_reasoning": f"{c.department} department clerk with active workload of {c.active_request_count}."
        }
        for c in candidates if c.clerk_id != updated.get("recommended_clerk_id")
    ]

    rec_payload = {
        "service_id": updated.get("service_id") or 0,
        "service_name": updated.get("service_name") or "",
        "required_documents": updated.get("required_documents", []),
        "submitted_documents": submitted,
        "missing_documents": missing,
        "documents_complete": len(missing) == 0,
        "recommended_clerk": {
            "clerk_id": updated.get("recommended_clerk_id"),
            "clerk_name": updated.get("recommended_clerk_name") or (matched_clerk.name if matched_clerk else "Assigned Clerk"),
            "department": updated.get("recommended_clerk_dept") or (matched_clerk.department if matched_clerk else "Legal Operations"),
            "contact": matched_clerk.contact if matched_clerk else "clerk@lexintelligence.com",
            "current_workload": matched_clerk.active_request_count if matched_clerk else 0,
            "max_workload": 10,
            "matching_score": 0.95,
            "selection_reasoning": updated.get("recommendation_reason") or "Selected based on specialization match and optimal workload."
        },
        "alternative_clerks": alt_clerks,
        "summary": f"Service matched: {updated.get('service_name')}. Audited {len(submitted)} documents. Recommended {updated.get('recommended_clerk_name')} ({updated.get('recommended_clerk_dept')}).",
        "notes": updated.get("recommendation_reason") or ""
    }

    exec_summary = {
        "workflow_id": updated.get("workflow_id"),
        "final_status": updated.get("phase", "ADMIN_APPROVAL_PENDING"),
        "service_identified": updated.get("service_name", ""),
        "clerk_assigned_name": updated.get("recommended_clerk_name", ""),
        "total_steps": len(updated.get("audit_log", [])),
        "audit_notes": f"AI Documentation agent analyzed request #{request.request_id}."
    }

    return AgentAnalysisResponse(
        status="ADMIN_APPROVAL_PENDING",
        workflow_id=updated.get("workflow_id"),
        message=_last_agent_message(updated),
        phase=updated.get("phase"),
        recommendation=rec_payload,
        execution_summary=exec_summary,
        errors=[]
    )


# ============================================================
# Admin Approval
# ============================================================

@router.post("/workflows/{workflow_id}/approve", response_model=AgentApprovalResponse)
async def approve_workflow(workflow_id: str, request: SubmitApprovalRequest):
    """
    Forward admin approve/reject decision.
    Called by AgentIntegrationService.cs SubmitApprovalDecisionAsync().
    """
    # Find session by workflow_id
    session_id = _find_session_by_workflow_id(workflow_id)
    if not session_id:
        raise HTTPException(status_code=404, detail=f"Workflow '{workflow_id}' not found.")

    approved_by_val = 1
    if isinstance(request.approved_by, int):
        approved_by_val = request.approved_by
    elif isinstance(request.approved_by, str) and request.approved_by.isdigit():
        approved_by_val = int(request.approved_by)

    try:
        updated = await record_admin_decision_and_resume(
            session_id=session_id,
            decision=request.decision,
            approved_by=approved_by_val,
            comment=request.comment,
        )
    except Exception as e:
        logger.error("Admin approval processing failed: %s", e)
        return AgentApprovalResponse(
            workflow_id=workflow_id,
            status="ERROR",
            errors=[str(e)],
        )

    return AgentApprovalResponse(
        workflow_id=workflow_id,
        status=updated["phase"],
        message=_last_agent_message(updated),
    )


@router.get("/workflows/{workflow_id}")
async def get_workflow_state(workflow_id: str):
    """Returns raw workflow state JSON. Called by AgentIntegrationService.cs GetWorkflowStateAsync()."""
    session_id = _find_session_by_workflow_id(workflow_id)
    if not session_id:
        raise HTTPException(status_code=404, detail=f"Workflow '{workflow_id}' not found.")
    state = get_state(session_id)
    # Return safe subset (no full document content, no secrets)
    return {
        "workflow_id": workflow_id,
        "session_id": session_id,
        "phase": state["phase"],
        "service_name": state.get("service_name"),
        "request_id": state.get("request_id"),
        "required_documents": state.get("required_documents", []),
        "document_statuses": {
            dt: {"status": ds["status"], "retry_count": ds["retry_count"]}
            for dt, ds in state.get("document_statuses", {}).items()
        },
        "human_review_triggered": state.get("human_review_triggered", False),
        "iteration_count": state.get("iteration_count", 0),
    }


@router.get("/workflows/{workflow_id}/summary")
async def get_workflow_summary(workflow_id: str):
    """Returns execution summary. Called by AgentIntegrationService.cs GetWorkflowSummaryAsync()."""
    session_id = _find_session_by_workflow_id(workflow_id)
    if not session_id:
        raise HTTPException(status_code=404, detail=f"Workflow '{workflow_id}' not found.")
    state = get_state(session_id)
    return {
        "workflow_id": workflow_id,
        "phase": state["phase"],
        "document_summary": state.get("document_summary"),
        "recommended_clerk_id": state.get("recommended_clerk_id"),
        "recommendation_reason": state.get("recommendation_reason"),
        "last_admin_decision": state.get("last_admin_decision"),
        "audit_log_count": len(state.get("audit_log", [])),
        "audit_log": state.get("audit_log", []),
    }


@router.get("/request/{request_id}/status")
async def get_request_status(request_id: int):
    """UI status poll endpoint — finds workflow by request_id."""
    for sid, state in _all_states():
        if state.get("request_id") == request_id:
            return {
                "request_id": request_id,
                "session_id": sid,
                "phase": state["phase"],
                "workflow_id": state.get("workflow_id"),
                "missing_documents": _missing_documents(state),
            }
    raise HTTPException(status_code=404, detail=f"No workflow found for request_id={request_id}.")


# ============================================================
# Helpers
# ============================================================

def _last_agent_message(state: AgentState | dict) -> str:
    messages = state.get("messages", [])
    agent_msgs = [m for m in reversed(messages) if m.get("role") == "agent"]
    return agent_msgs[0]["content"] if agent_msgs else ""


def _last_action_options(state: AgentState | dict) -> list[str]:
    """Returns the action_options from pending_action_options or the last agent message."""
    if state.get("pending_action_options"):
        return list(state["pending_action_options"])
    for msg in reversed(state.get("messages", [])):
        if msg.get("role") == "agent" and msg.get("action_options"):
            return list(msg["action_options"])
    return []


def _missing_documents(state: AgentState | dict) -> list[str]:
    required = state.get("required_documents", [])
    statuses = state.get("document_statuses", {})
    return [
        dt for dt in required
        if statuses.get(dt, {}).get("status") not in ("accepted", "accepted_with_flag")
    ]


def _last_document_analysis(state: AgentState | dict) -> dict | None:
    statuses = state.get("document_statuses", {})
    for ds in reversed(list(statuses.values())):
        if ds.get("last_analysis"):
            return ds["last_analysis"]
    return None


def _next_expected_doc_type(state: AgentState | dict) -> str | None:
    """Returns the first document type still pending or rejected."""
    required = state.get("required_documents", [])
    statuses = state.get("document_statuses", {})
    for dt in required:
        if statuses.get(dt, {}).get("status") in ("pending", "rejected", None):
            return dt
    return None


def _find_session_by_workflow_id(workflow_id: str) -> str | None:
    """Find a session_id by its workflow_id."""
    from app.graph.workflow import _state_store, _SESSIONS_DIR
    for sid, state in _state_store.items():
        if state.get("workflow_id") == workflow_id:
            return sid
    import json
    for p in _SESSIONS_DIR.glob("*.json"):
        try:
            data = json.loads(p.read_text(encoding="utf-8"))
            if data.get("workflow_id") == workflow_id:
                _state_store[p.stem] = data
                return p.stem
        except Exception:
            pass
    return None


def _all_states():
    """Return all (session_id, state) pairs — from memory first, then disk."""
    from app.graph.workflow import _state_store, _SESSIONS_DIR
    import json

    # Seed memory with any on-disk sessions not yet loaded
    for p in _SESSIONS_DIR.glob("*.json"):
        sid = p.stem
        if sid not in _state_store:
            try:
                data = json.loads(p.read_text(encoding="utf-8"))
                _state_store[sid] = data
            except Exception:
                pass

    return list(_state_store.items())
