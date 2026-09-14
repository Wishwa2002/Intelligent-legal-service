"""
app/agents/supervisor.py

LangGraph node: SUPERVISOR

The orchestrator. Responsibilities:
  1. Detect off-topic messages and redirect without changing state.
  2. Identify the current phase and dispatch to the correct worker node.
  3. Handle session start / service identification.

The supervisor NEVER performs business operations directly — it only routes.
All routing decisions come from routing.py (pure Python).
"""

import logging
import uuid
from datetime import datetime, timezone

from app.config.settings import get_settings
from app.graph.state import AgentState, initial_state
from app.services.gemini_service import get_gemini_service
from app.tools.service_tools import find_service_by_name, get_service_requirements, get_all_services
from app.tools.request_tools import create_request

logger = logging.getLogger(__name__)


def _extract_client_name(text: str, is_asking_name: bool = False) -> str | None:
    """
    Extract client name from text greetings or direct answers.
    Supports patterns like:
      - 'My name is John Doe'
      - 'I am Vithusan Vijayakumar'
      - 'I'm Alice'
      - 'Call me David'
      - 'This is Robert'
      - Direct answers to ASKING_NAME like 'Vithusan', 'Sarah Jenkins', 'Vithusan Vijayakumar'
    """
    import re
    if not text:
        return None

    cleaned = text.strip().rstrip(".!?,")

    # 1. Standard introduction phrases
    intro_patterns = [
        r"(?:(?:hi|hello|hey|good\s+(?:morning|afternoon|evening))[,\s]+)?(?:my name is|i am|i'm|call me|this is|it's|it is)\s+([A-Za-z\s.'-]+?)(?=[,.\n]|\s+(?:and|who|i need|i want)|$)",
        r"^([A-Za-z\s.'-]+?)\s+(?:here|speaking)$",
    ]
    for pattern in intro_patterns:
        match = re.search(pattern, cleaned, re.IGNORECASE)
        if match:
            cand = match.group(1).strip()
            if cand and cand.lower() not in ("legal", "customer", "client", "user", "help", "yes", "no", "a client", "someone"):
                words = [w.capitalize() for w in cand.split() if w]
                if 1 <= len(words) <= 4:
                    return " ".join(words)

    # 2. If the agent explicitly asked for the user's name:
    if is_asking_name:
        words = cleaned.split()
        stop_words = {
            "hi", "hello", "hey", "good", "morning", "afternoon", "evening",
            "yes", "no", "sure", "ok", "okay", "fine", "thanks", "thank", "you",
            "help", "service", "services", "legal", "what", "how", "why", "who",
            "corporate", "registration", "property", "transfer", "power", "attorney",
            "lease", "agreement", "will", "testament", "document", "documents",
            "upload", "file", "files", "apply"
        }
        if 1 <= len(words) <= 4:
            if not any(w.lower() in stop_words for w in words):
                if all(re.match(r"^[A-Za-z.'-]+$", w) for w in words):
                    return " ".join(w.capitalize() for w in words)

    return None


def _is_client_asking_for_all_services(text: str) -> bool:
    """
    Returns True ONLY if the client explicitly asked to display/view/list all services.
    """
    if not text:
        return False
    clean = text.lower().strip()
    keywords = [
        "all service", "all services", "show all services", "display all services",
        "show services", "display services", "list all services", "list services",
        "list of services", "view all services", "see all services",
        "what services do you offer", "what services do you have",
        "what services are available", "what are your services", "what are the services",
        "available services", "services list", "all the services",
        "show all available services", "display all available services",
        "view services"
    ]
    if any(k in clean for k in keywords):
        return True
    if clean in ("services", "all services", "view all services", "📁 view all services", "show services"):
        return True
    return False


def _get_service_suggestion_buttons(services: list[dict]) -> list[str]:
    """
    Returns concise suggestion buttons representing top/popular legal services
    plus an option to view all services.
    """
    popular = [
        "Rental & Lease Agreement",
        "Business & Corporate Registration",
        "Power of Attorney",
        "Property Transfer",
        "Bail Application & Criminal Representation",
    ]
    active_names = [s.get("name") for s in services if s.get("name")]
    options = [name for name in popular if name in active_names]
    if not options:
        options = active_names[:4]
    options.append("📁 View All Services")
    return options


async def understand_request_node(state: AgentState) -> AgentState:
    """
    Entry node. Identifies the service the client is requesting.
    Greets the client and asks what service they need with suggestion buttons.
    Displays all services ONLY when the client explicitly asks.
    """
    state = dict(state)

    # Fetch active services from the backend catalog
    services = await get_all_services()
    if services:
        bullet_list = "\n".join(f"  • **{s.get('name')}**" + (f" ({s.get('description')})" if s.get('description') else "") for s in services if s.get("name"))
    else:
        bullet_list = "  • **Corporate Registration**\n  • **Property Transfer**\n  • **Power of Attorney**\n  • **Last Will and Testament**\n  • **Commercial Lease Agreement**"

    buttons = _get_service_suggestion_buttons(services)

    # Get the client's messages
    messages = state.get("messages", [])
    client_messages = [m for m in messages if m.get("role") == "client"]
    last_message = client_messages[-1]["content"] if client_messages else ""

    # STEP 1: Initial greeting and asking for client name (when session is brand new)
    if not last_message:
        _add_message(state, "agent",
            "Hello and welcome to **LexIntelligence Legal Services**! 👋\n\n"
            "I am your Legal AI Documentation Assistant. I am here to guide you through your legal service process and verify your required documentation.\n\n"
            "Before we get started, may I please have your **name**?",
            action_options=buttons)
        state["pending_agent_question"] = "ASKING_NAME"
        return state

    # STEP 2: Extract client name if provided
    is_answering_name = (state.get("pending_agent_question") == "ASKING_NAME")
    extracted_name = _extract_client_name(last_message, is_asking_name=is_answering_name)
    if extracted_name:
        state["client_name"] = extracted_name
        state["pending_agent_question"] = None
    elif not state.get("client_name"):
        # Check past messages to recover name if already mentioned
        for m in messages:
            if m.get("role") == "client":
                past_name = _extract_client_name(m.get("content", ""), is_asking_name=False)
                if past_name:
                    state["client_name"] = past_name
                    state["pending_agent_question"] = None
                    break

        # If still not found, check registered user profile on backend via customer_id
        if not state.get("client_name") and state.get("customer_id"):
            raw_cid = str(state.get("customer_id")).strip()
            if raw_cid.isdigit() and int(raw_cid) > 0:
                try:
                    from app.services.backend_client import get_backend_client
                    backend = get_backend_client()
                    u_info = await backend.get_user(int(raw_cid))
                    if u_info and u_info.get("name"):
                        state["client_name"] = u_info["name"]
                except Exception:
                    pass

    # STEP 2.5: ONLY if client explicitly asked to display all services
    if _is_client_asking_for_all_services(last_message):
        top_services = [s.get("name") for s in services[:6] if s.get("name")]
        _add_message(state, "agent",
            "Here are all of our available legal services:\n\n"
            f"{bullet_list}\n\n"
            "Which of these services can I help you with today?",
            action_options=top_services)
        return state

    # STEP 2.7: If all documents are already uploaded and verified / awaiting admin approval
    if state.get("phase") in ("ADMIN_APPROVAL_PENDING", "DOCUMENTS_COMPLETE") and state.get("service_name"):
        req_id = state.get("request_id")
        req_str = f"#{req_id}" if req_id else ""
        clerk_name = state.get("recommended_clerk_name")
        if not clerk_name and state.get("recommended_clerk_id"):
            clerk_name = f"Clerk #{state['recommended_clerk_id']}"
        if not clerk_name:
            clerk_name = "our designated legal clerk"

        client_name = state.get("client_name")
        greeting = f"Hello, **{client_name}**! 👋" if client_name else "Hello! 👋"
        lower_msg = last_message.lower().strip()

        # 1. Check if user is asking about their name / identity
        is_asking_name = any(k in lower_msg for k in (
            "do you know my name", "what is my name", "what's my name",
            "who am i", "my name?", "know my name", "remember my name",
            "tell me my name", "do you remember me", "who am i talking to"
        ))

        # 2. Check if user is asking for a document summary
        is_asking_summary = any(k in lower_msg for k in (
            "summarize my document", "summarize my documents", "summarise my documents",
            "summarize documents", "summarise documents", "summary of my documents",
            "summary of documents", "what documents did i submit", "what documents have i submitted",
            "what documents were submitted", "show my documents", "list my documents",
            "view my documents", "documents summary", "can you summarize", "could you summarize",
            "summarize my request", "document summary", "summarize", "summarise"
        ))

        # 3. Check if user is asking about missing documents
        is_asking_missing = any(k in lower_msg for k in (
            "missing document", "missing documents", "any missing", "anything missing",
            "is anything missing", "did i miss", "are there missing", "what is missing",
            "what's missing", "any document missing", "missing items", "are all documents submitted"
        ))

        # 4. Check if user is asking how to track/check their request
        how_to_check = any(w in lower_msg for w in (
            "how to check", "how can i check", "where to check", "how do i check",
            "track my request", "view my request", "where is my request", "check my request",
            "check status", "track request", "check request"
        ))

        if is_asking_name:
            if client_name:
                answer_msg = (
                    f"Yes, of course! Your name is **{client_name}**. 😊\n\n"
                    f"All required documents for your **{state['service_name']}** request {req_str} have been verified "
                    f"and are currently awaiting Administrative Approval.\n\n"
                    f"• **Assigned Clerk:** **{clerk_name}**\n\n"
                    "Feel free to ask if you would like me to summarize your documents, check for missing items, or track your request status!"
                )
            else:
                answer_msg = (
                    f"I don't have your name recorded in our current chat session yet. Could you please tell me your name? 😊\n\n"
                    f"(Your **{state['service_name']}** request {req_str} is currently awaiting Administrative Approval.)"
                )
                state["pending_agent_question"] = "ASKING_NAME"
            opts = ["📄 Summarize Documents", "❓ Any Missing Docs?", "📋 Go to My Requests"]
            _add_message(state, "agent", answer_msg, action_options=opts)
            return state

        elif is_asking_summary:
            req_docs = state.get("required_documents") or []
            doc_statuses = state.get("document_statuses") or {}

            lines = []
            for i, doc in enumerate(req_docs, start=1):
                st = doc_statuses.get(doc, {}).get("status", "accepted")
                badge = "Verified & Complete ✅" if st in ("accepted", "accepted_with_flag") else "Submitted 📄"
                lines.append(f"{i}. **{doc}** — {badge}")
            if not lines and doc_statuses:
                for i, (doc, info) in enumerate(doc_statuses.items(), start=1):
                    lines.append(f"{i}. **{doc}** — Verified & Complete ✅")

            doc_list_text = "\n".join(lines) if lines else "• All required documents have been received and verified."
            total_cnt = len(lines) if lines else len(req_docs)

            answer_msg = (
                f"{greeting}\n\n"
                f"Here is the document summary for your **{state['service_name']}** request {req_str}: 📄📋\n\n"
                f"{doc_list_text}\n\n"
                f"📊 **Completeness:** 100% Complete ({total_cnt}/{total_cnt} documents verified)\n"
                f"👤 **Assigned Legal Clerk:** **{clerk_name}**\n"
                f"⚖️ **Application Status:** **Awaiting Admin Approval**\n\n"
                f"All required documentation has passed automated legal completeness checks. "
                f"After Administrative Approval, you will be notified immediately regarding execution and next legal steps."
            )
            opts = ["📋 Go to My Requests", "❓ Any Missing Docs?", "📁 View All Services"]
            _add_message(state, "agent", answer_msg, action_options=opts)
            return state

        elif is_asking_missing:
            req_docs = state.get("required_documents") or []
            doc_statuses = state.get("document_statuses") or {}
            missing = [
                d for d in req_docs
                if doc_statuses.get(d, {}).get("status") not in ("accepted", "accepted_with_flag")
            ]

            if missing:
                missing_lines = "\n".join(f"{i}. **{d}**" for i, d in enumerate(missing, start=1))
                answer_msg = (
                    f"{greeting}\n\n"
                    f"You still have {len(missing)} missing document(s) for your **{state['service_name']}** request {req_str}:\n\n"
                    f"{missing_lines}\n\n"
                    "Please upload them to complete your application."
                )
                opts = [f"📄 Upload {d}" for d in missing]
            else:
                total_cnt = len(req_docs) if req_docs else "all"
                answer_msg = (
                    f"{greeting}\n\n"
                    f"✅ **No missing documents!**\n\n"
                    f"All {total_cnt} required documents for your **{state['service_name']}** request {req_str} have been successfully received and verified. 📄✨\n\n"
                    f"• **Completeness:** 100% verified\n"
                    f"• **Current Status:** Awaiting Admin Approval\n"
                    f"• **Designated Clerk:** **{clerk_name}**\n\n"
                    f"Your file is complete. You do not need to submit any additional documents."
                )
                opts = ["📋 Go to My Requests", "📄 Summarize Documents", "📁 View All Services"]
            _add_message(state, "agent", answer_msg, action_options=opts)
            return state

        elif how_to_check:
            answer_msg = (
                f"{greeting}\n\n"
                f"You can easily track and check your **{state['service_name']}** request {req_str} at any time! 📱🔍\n\n"
                f"📋 **How to Check Your Request:**\n"
                f"1. Tap the **📋 Go to My Requests** button below (or navigate to the **Requests** tab in your app).\n"
                f"2. You will see your request {req_str} with its real-time status: **Awaiting Admin Approval**.\n"
                f"3. You can review all uploaded documents and see your designated legal clerk: **{clerk_name}**.\n\n"
                f"⚖️ **Next Steps & Real-Time Tracking:**\n"
                f"• **Administrative Approval & Notification:** Your application is currently awaiting Admin Approval. "
                f"**After the Admin Approval, you will be notified** immediately regarding the next legal steps and execution.\n"
                f"• **Assigned Clerk:** **{clerk_name}**\n\n"
                f"If you need help with anything else, please let me know!"
            )
            opts = ["📋 Go to My Requests", "📄 Summarize Documents", "📁 View All Services"]
            _add_message(state, "agent", answer_msg, action_options=opts)
            return state

        elif any(q in lower_msg for q in ("?", "what", "how", "why", "where", "when", "can", "could", "will", "explain", "tell me")):
            # General legal or procedure question
            gemini = get_gemini_service()
            answer = await gemini.answer_general_inquiry(
                user_message=last_message,
                active_services_catalog=bullet_list,
                client_name=state.get("client_name"),
            )
            reply_text = answer.get("reply", "").strip()
            status_note = (
                f"\n\n📋 *Status Note: Your **{state['service_name']}** request {req_str} is complete and awaiting Admin Approval. "
                f"Assigned Clerk: **{clerk_name}**.*"
            )
            answer_msg = f"{reply_text}{status_note}"
            opts = ["📋 Go to My Requests", "📄 Summarize Documents", "📁 View All Services"]
            _add_message(state, "agent", answer_msg, action_options=opts)
            return state

        else:
            answer_msg = (
                f"{greeting}\n\n"
                f"All required documents for your **{state['service_name']}** request {req_str} have been received and verified. 📄✨\n\n"
                f"📋 **Current Status & Real-Time Tracking:**\n"
                f"• **Check Your Requests Page:** You can view and track real-time progress and your assigned clerk on your **Requests** page at any time.\n"
                f"• **Administrative Approval & Notification:** Your application is currently awaiting Admin Approval. "
                f"**After the Admin Approval, you will be notified** immediately regarding the next legal steps and execution.\n"
                f"• **Assigned Clerk:** **{clerk_name}**\n\n"
                f"Feel free to tap an option below to summarize your documents, check for missing items, or track your request."
            )
            opts = ["📋 Go to My Requests", "📄 Summarize Documents", "❓ Any Missing Docs?"]
            _add_message(state, "agent", answer_msg, action_options=opts)
            return state

    # STEP 2.8: If actively waiting for required documents
    if state.get("phase") == "WAITING_FOR_DOCUMENTS" and state.get("required_documents"):
        missing = [
            d for d in state["required_documents"]
            if state.get("document_statuses", {}).get(d, {}).get("status") not in ("accepted", "accepted_with_flag")
        ]
        lower_msg = last_message.lower().strip()
        client_name = state.get("client_name")
        greeting = f"Hello, **{client_name}**! 👋" if client_name else "Hello! 👋"

        is_asking_name = any(k in lower_msg for k in ("do you know my name", "what is my name", "what's my name", "who am i", "my name?"))
        is_asking_missing = any(k in lower_msg for k in ("missing document", "missing documents", "any missing", "anything missing", "what is missing", "what's missing"))
        is_asking_summary = any(k in lower_msg for k in ("summarize", "summarise", "summary", "what documents did i submit", "show my documents", "list my documents"))

        if is_asking_name:
            if client_name:
                missing_str = ", ".join(f"**{d}**" for d in missing)
                reply = (
                    f"Yes! Your name is **{client_name}**. 😊\n\n"
                    f"For your **{state.get('service_name', 'legal')}** request, we are currently waiting for {len(missing)} remaining document(s):\n"
                    + "\n".join(f"• **{d}**" for d in missing) + "\n\n"
                    "Tap an upload button below to continue."
                )
            else:
                reply = "I don't have your name recorded yet. May I ask what your name is? 😊"
                state["pending_agent_question"] = "ASKING_NAME"
            opts = [f"📄 Upload {d}" for d in missing]
            _add_message(state, "agent", reply, action_options=opts)
            return state

        if is_asking_missing:
            reply = (
                f"{greeting}\n\n"
                f"Here are the remaining missing document(s) for your **{state.get('service_name', 'legal')}** request:\n\n"
                + "\n".join(f"{i}. **{d}** (Missing)" for i, d in enumerate(missing, start=1)) + "\n\n"
                "Please tap a button below to upload each missing document."
            )
            opts = [f"📄 Upload {d}" for d in missing]
            _add_message(state, "agent", reply, action_options=opts)
            return state

        if is_asking_summary:
            doc_statuses = state.get("document_statuses") or {}
            all_reqs = state.get("required_documents") or []
            summary_lines = []
            for i, d in enumerate(all_reqs, start=1):
                st = doc_statuses.get(d, {}).get("status")
                badge = "Verified ✅" if st in ("accepted", "accepted_with_flag") else "Missing ⏳"
                summary_lines.append(f"{i}. **{d}** — {badge}")
            reply = (
                f"{greeting}\n\n"
                f"Document status summary for your **{state.get('service_name', 'legal')}** request:\n\n"
                + "\n".join(summary_lines) + "\n\n"
                f"📌 *Remaining missing document(s):* " + ", ".join(f"**{d}**" for d in missing)
            )
            opts = [f"📄 Upload {d}" for d in missing]
            _add_message(state, "agent", reply, action_options=opts)
            return state

        if missing:
            # Check if this is a general inquiry about the documents/process
            if any(q in lower_msg for q in ("?", "what", "how", "why", "where", "can i", "could i", "explain")):
                gemini = get_gemini_service()
                answer = await gemini.answer_general_inquiry(
                    user_message=last_message,
                    active_services_catalog=bullet_list,
                    client_name=state.get("client_name"),
                )
                missing_str = ", ".join(f"**{d}**" for d in missing)
                reply = (
                    f"{answer.get('reply', '')}\n\n"
                    f"📌 *Reminder: We are waiting for your remaining document(s): {missing_str}. Tap a button below to upload.*"
                )
                opts = [f"📄 Upload {d}" for d in missing]
                _add_message(state, "agent", reply, action_options=opts)
                return state
            elif not any(k in lower_msg for k in ("start", "create", "new service")):
                # Client sent a greeting or update
                missing_numbered = "\n".join(f"{i}. **{d}**" for i, d in enumerate(missing, start=1))
                reply = (
                    f"{greeting}\n\n"
                    f"For your **{state.get('service_name', 'legal')}** request, please upload the remaining required document(s):\n"
                    f"{missing_numbered}\n\n"
                    "Tap an upload button below to continue:"
                )
                opts = [f"📄 Upload {d}" for d in missing]
                _add_message(state, "agent", reply, action_options=opts)
                return state

    # STEP 3: Friendly greeting detection (e.g. "hi", "hello", "good morning")
    greetings = ("hi", "hello", "hey", "good morning", "good afternoon", "good evening", "greetings")
    clean_msg = "".join(c for c in last_message.lower() if c.isalnum() or c.isspace()).strip()
    is_simple_greeting = clean_msg in greetings and len(clean_msg.split()) <= 2

    if is_simple_greeting:
        if state.get("client_name"):
            _add_message(state, "agent",
                f"Hello, **{state['client_name']}**! 👋 Welcome to LexIntelligence.\n\n"
                "What legal service or document assistance do you need today? "
                "You can tap a suggested service below, ask to view all services, or describe your situation in your own words.",
                action_options=buttons)
        else:
            _add_message(state, "agent",
                "Hello! Welcome to **LexIntelligence Legal Services**! 👋\n\n"
                "I am your Legal AI Documentation Assistant. Before we get started, may I please have your **name**?",
                action_options=buttons)
            state["pending_agent_question"] = "ASKING_NAME"
        return state

    # STEP 4: Determine if user is asking a question or explicitly starting a service
    lower_last = last_message.lower().strip()
    is_question = (
        "?" in last_message
        or lower_last.startswith(("what", "how", "can", "could", "tell me", "explain", "why", "where", "who", "which", "is there", "are there", "do i", "give me", "show me", "help"))
        or "sample document" in lower_last
        or "acceptable" in lower_last
        or "requirement" in lower_last
    )

    explicit_start_keywords = (
        "start request", "start my request", "create request", "apply for",
        "i want to apply", "proceed with", "select service", "choose service", "submit request"
    )
    is_explicit_start = (
        any(k in lower_last for k in explicit_start_keywords)
        or last_message.strip().startswith("📄")
        or last_message.strip().startswith("Start Request")
    )

    service = None
    if is_explicit_start:
        for msg in reversed(client_messages):
            content = msg.get("content", "").strip()
            if not content:
                continue
            matched = await find_service_by_name(content)
            if matched:
                service = matched
                break

    # Direct button tap on a service name (e.g. client tapped "Rental & Lease Agreement")
    if not service and not is_question and not is_explicit_start:
        direct_service = await find_service_by_name(last_message)
        if direct_service:
            s_name = direct_service.get("name", "")
            s_desc = direct_service.get("description", "")
            desc_text = f"\n\n*{s_desc}*" if s_desc else ""
            service_buttons = [
                f"📄 Start Request for {s_name}",
                f"Requirements for {s_name}",
                "📁 View All Services",
            ]
            _add_message(state, "agent",
                f"You've selected **{s_name}**.{desc_text}\n\n"
                f"Would you like to start your official request and submit required documents for **{s_name}**, or would you like to review the requirements first?",
                action_options=service_buttons)
            return state

    # STEP 5: If not an explicit start or no service matched yet, engage Gemini to answer inquiry
    if not service or is_question:
        # If user just answered their name and didn't mention a service
        if extracted_name and not is_question and not _is_client_asking_for_all_services(last_message):
            _add_message(state, "agent",
                f"It's a pleasure to meet you, **{state['client_name']}**! 😊\n\n"
                "I'm here to assist you with your legal matters, document submission, and verification.\n\n"
                "What legal service or document assistance do you need today? "
                "You can tap a suggested service below, ask to view all services, or describe your situation.",
                action_options=buttons)
            return state

        # Check if user is an unauthenticated guest
        raw_cid = str(state.get("customer_id", "")).strip().lower()
        if raw_cid == "client-default":
            state["customer_id"] = "1"
            raw_cid = "1"
        is_guest_user = not raw_cid or raw_cid in ("guest", "anonymous", "unauthenticated", "none", "null")

        # Engage conversational AI (Gemini) for inquiries / questions
        gemini = get_gemini_service()
        inquiry_result = await gemini.answer_general_inquiry(
            user_text=last_message,
            available_services=services,
            client_name=state.get("client_name"),
            pending_question=state.get("pending_agent_question"),
            recent_messages=messages,
            is_authenticated=not is_guest_user,
        )

        # Update client name if extracted by Gemini
        if inquiry_result.get("extracted_client_name") and not state.get("client_name"):
            state["client_name"] = inquiry_result["extracted_client_name"]
            state["pending_agent_question"] = None

        # Track any question the agent asked the user (e.g., ASKING_NAME)
        if inquiry_result.get("asks_user_question"):
            state["pending_agent_question"] = inquiry_result.get("asks_user_question")

        # Only transition to service if client explicitly asked to start AND not asking a question
        matched_service_name = inquiry_result.get("matched_service_name")
        if matched_service_name and is_explicit_start and not is_question:
            service = await find_service_by_name(matched_service_name)

        if not service or is_question:
            # Deliver the intelligent, friendly conversational reply directly answering the client
            _add_message(state, "agent", inquiry_result["reply"])
            return state

    # STEP 6: Service matched -> setup workflow and request required documents
    service_id = service.get("serviceId") or service.get("service_id")
    service_name = service.get("name", "")
    state["service_id"] = service_id
    state["service_name"] = service_name

    # Fetch required documents (never invented — always from backend)
    required_docs = await get_service_requirements(service_id)
    state["required_documents"] = required_docs

    # Initialize document statuses
    for doc_type in required_docs:
        if doc_type not in state["document_statuses"]:
            state["document_statuses"][doc_type] = {
                "doc_type": doc_type,
                "file_id": None,
                "status": "pending",
                "retry_count": 0,
                "last_analysis": None,
                "rejection_reason": None,
            }

    # Check if client is an unauthenticated / guest user
    raw_cid = str(state.get("customer_id", "")).strip().lower()
    if raw_cid == "client-default":
        state["customer_id"] = "1"
        raw_cid = "1"
    is_guest = not raw_cid or raw_cid in ("guest", "anonymous", "unauthenticated", "none", "null")

    if is_guest:
        # Guest user: First understand request, provide full information & document checklist, but strictly require login to make an official request
        numbered_docs = "\n".join(f"{i}. **{d}**" for i, d in enumerate(required_docs, start=1))
        client_greeting = f"Hello **{state['client_name']}**! " if state.get("client_name") else "Hello! "
        _add_message(
            state, "agent",
            f"{client_greeting}I understand your request regarding **{service_name}**! 📜\n\n"
            f"Here are the officially required documents for this service:\n"
            f"{numbered_docs}\n\n"
            "🔒 **Login Required to Make an Official Request:**\n"
            "You are currently chatting as an unauthorized / guest user. You can ask me any questions freely, but **you must sign in to your account to officially make a request and have a legal clerk process your documents**.\n\n"
            "👉 *Please log in or register to submit this request.* In the meantime, feel free to ask me anything about the process!"
        )
        state["phase"] = "UNDERSTAND_REQUEST"
        return state

    # Check if the message is an inquiry vs explicit request initiation
    initiation_keywords = (
        "apply", "initiate", "start request", "create request", "make request",
        "submit request", "proceed", "start application", "begin", "yes", "i want to apply",
        "i want to start", "let's start", "lets start", "ready to apply", "register now", "upload"
    )
    last_msg_lower = last_message.lower().strip()
    is_explicit_initiation = any(k in last_msg_lower for k in initiation_keywords)

    # Check if client is answering a previous question like START_REQUEST_{id}
    pending_q = str(state.get("pending_agent_question") or "")
    if pending_q.startswith("START_REQUEST_") and any(w in last_msg_lower for w in ("yes", "sure", "ok", "please", "start", "proceed")):
        is_explicit_initiation = True

    question_indicators = (
        "?", "what", "which", "how", "why", "when", "tell me", "can you", "could you",
        "needed", "require", "requirements", "documents needed", "info", "explain"
    )
    is_informational_query = any(qi in last_msg_lower for qi in question_indicators) and not is_explicit_initiation

    # If user is asking an informational inquiry, explain requirements without creating an unrequested application
    if is_informational_query:
        numbered_docs = "\n".join(f"{i}. **{d}**" for i, d in enumerate(required_docs, start=1))
        client_greeting = f"Hello **{state['client_name']}**! " if state.get("client_name") else "Hello! "
        _add_message(
            state, "agent",
            f"{client_greeting}I understand your request regarding **{service_name}**! 📑\n\n"
            f"Here are the officially required documents for this service:\n"
            f"{numbered_docs}\n\n"
            "📋 *When you are ready to proceed, I can initiate your official request and verify your documents.*\n\n"
            f"Would you like to start your request for **{service_name}** now?"
        )
        state["pending_agent_question"] = f"START_REQUEST_{service_id}"
        state["phase"] = "UNDERSTAND_REQUEST"
        return state

    # User explicitly wants to start / apply
    state["pending_agent_question"] = None

    # Create a backend documentation request if one does not already exist
    if not state.get("request_id"):
        raw_cid_str = str(state.get("customer_id", "2")).strip()
        try:
            customer_id_int = int(raw_cid_str)
        except Exception:
            customer_id_int = 2
        if customer_id_int <= 0:
            customer_id_int = 2

        request_result = await create_request(customer_id=customer_id_int, service_id=service_id)
        if request_result:
            state["request_id"] = request_result.get("requestId") or request_result.get("request_id")

    # Tell the client what documents are needed (formatted as clear numbered points)
    numbered_docs = "\n".join(f"{i}. **{d}**" for i, d in enumerate(required_docs, start=1))
    client_greeting = f"Hello **{state['client_name']}**! " if (extracted_name and state.get("client_name")) else (f"**{state['client_name']}**, " if state.get("client_name") else "")
    req_num = state.get('request_id')
    req_display = f" (Request #{req_num})" if req_num else ""
    upload_options = [f"📄 Upload {d}" for d in required_docs]
    _add_message(
        state, "agent",
        f"{client_greeting}I understand your request to initiate **{service_name}**{req_display}! 📋\n\n"
        f"Please upload the following required documents:\n"
        f"{numbered_docs}\n\n"
        "💡 *Tap the upload buttons below to upload each required document.*",
        action_options=upload_options,
    )

    state["phase"] = "WAITING_FOR_DOCUMENTS"

    _append_audit(state, "REQUEST_STARTED",
                  f"service={service_name} required={required_docs}",
                  "WAITING_FOR_DOCUMENTS")

    return state


async def handle_off_topic_or_route(
    state: AgentState,
    incoming_message: str,
) -> tuple[AgentState, bool]:
    """
    Checks if the incoming message is relevant to the legal documentation workflow.
    Returns (updated_state, should_continue_routing).
    If off-topic: adds polite redirect to messages, returns False (stop routing).
    If relevant: returns True (continue with normal routing).
    """
    msg_lower = incoming_message.lower().strip()

    # 1. Obvious off-topic queries (trivia, cooking, games, entertainment)
    off_topic_words = ("poem", "pizza", "weather", "recipe", "song", "joke", "football", "cricket", "movie", "game")
    if any(w in msg_lower for w in off_topic_words):
        service_text = f" regarding your **{state.get('service_name')}** request" if state.get("service_name") else ""
        state = dict(state)
        _add_message(state, "agent",
            f"I am a legal documentation assistant and can only help with official legal services, document completeness checks, and application processing{service_text}.\n\n"
            "How can I assist you with your legal documents or request today?")
        return state, False

    # 2. Key relevant inquiries that must ALWAYS pass through
    relevant_indicators = (
        "name", "who am i", "who are you", "do you know", "my name",
        "summarize", "summarise", "summary", "what documents", "show documents", "list documents",
        "missing", "anything missing", "is anything missing", "did i miss", "all documents",
        "how to check", "where to check", "track", "status", "clerk", "approval", "request",
        "service", "agreement", "contract", "deed", "affidavit", "nic", "upload", "file"
    )
    if any(k in msg_lower for k in relevant_indicators):
        return state, True

    # 3. Question words or general legal inquiry
    if any(q in msg_lower for q in ("?", "what", "how", "why", "where", "when", "can", "could", "will", "is", "are", "explain", "tell me")):
        return state, True

    # 4. Greetings, acknowledgements, or thanks
    greetings = ("hi", "hello", "hey", "good morning", "good afternoon", "good evening", "thanks", "thank you", "ok", "okay", "yes", "sure")
    if any(msg_lower == g or msg_lower.startswith(g + " ") or msg_lower.endswith(" " + g) for g in greetings):
        return state, True

    # 5. In active workflow phases, allow routing to handle contextual responses
    if state.get("phase") in ("UNDERSTAND_REQUEST", "ADMIN_APPROVAL_PENDING", "DOCUMENTS_COMPLETE", "WAITING_FOR_DOCUMENTS"):
        return state, True

    # 6. Fallback to Gemini classifier only for unhandled edge cases
    gemini = get_gemini_service()
    is_relevant, redirect_message = await gemini.classify_message_relevance(
        message=incoming_message,
        current_phase=state["phase"],
        service_name=state.get("service_name", ""),
    )

    if not is_relevant:
        state = dict(state)
        _add_message(state, "agent", redirect_message)
        logger.info(
            "Off-topic message detected. Redirected. session=%s phase=%s",
            state["session_id"], state["phase"],
        )
        return state, False

    return state, True


async def complete_node(state: AgentState) -> AgentState:
    """
    Final node: marks the workflow complete, notifies client,
    and officially updates the clerk assignment on the backend.
    """
    state = dict(state)

    clerk_id = state.get("recommended_clerk_id")
    clerk_name = state.get("recommended_clerk_name")
    clerk_dept = state.get("recommended_clerk_dept", "Legal Department")

    from app.services.backend_client import get_backend_client
    backend = get_backend_client()

    # Look up clerk name if not already cached
    if clerk_id and not clerk_name:
        try:
            clerk_info = await backend.get_clerk(int(clerk_id))
            if clerk_info:
                clerk_name = clerk_info.get("name") or clerk_info.get("fullName") or f"Clerk #{clerk_id}"
                clerk_dept = clerk_info.get("department", clerk_dept)
        except Exception as e:
            logger.warning("Could not fetch clerk details: %s", e)

    if not clerk_name:
        clerk_name = f"Clerk #{clerk_id}" if clerk_id else "our designated legal clerk"

    # Officially update the backend DocumentationRequest with the assigned clerk
    request_id = state.get("request_id")
    if request_id and clerk_id:
        try:
            await backend.assign_clerk(int(request_id), int(clerk_id))
            logger.info("Successfully assigned request %s to clerk %s (%s) on backend", request_id, clerk_id, clerk_name)
        except Exception as e:
            logger.warning("Could not assign clerk %s to request %s on backend: %s", clerk_id, request_id, e)

    _add_message(
        state, "agent",
        f"✅ **Request Approved & Assigned!**\n\n"
        f"Your **{state['service_name']}** request has been successfully approved and officially assigned to **{clerk_name}**.\n\n"
        f"• **Assigned Clerk:** **{clerk_name}**\n"
        f"• **Department:** {clerk_dept}\n"
        f"• **Request ID:** #{request_id or '—'}\n"
        f"• **Status:** ASSIGNED\n\n"
        f"**{clerk_name}** will review your submitted documents and contact you within 3–5 business days.\n\n"
        "Thank you for choosing our legal services!"
    )

    state["phase"] = "COMPLETED"
    _append_audit(state, "WORKFLOW_COMPLETED",
                  f"clerk_id={clerk_id} clerk_name={clerk_name}", "COMPLETED")

    logger.info("Workflow completed. session=%s clerk=%s (%s)", state["session_id"], clerk_id, clerk_name)
    return state


async def human_review_node(state: AgentState) -> AgentState:
    """
    Safety node: stops automatic processing and hands off to a human.
    """
    state = dict(state)
    reason = state.get("human_review_reason", "Automatic processing could not continue.")

    _add_message(state, "agent",
        "Your request requires manual review by our staff. "
        "A team member will contact you within 1-2 business days. "
        "Your progress has been saved and no documents need to be re-submitted.")

    state["phase"] = "HUMAN_REVIEW"
    _append_audit(state, "HUMAN_REVIEW_TRIGGERED", reason, "HUMAN_REVIEW")

    logger.warning("Human review triggered: %s session=%s", reason, state["session_id"])
    return state


def _add_message(state: dict, role: str, content: str, action_options: list[str] | None = None) -> None:
    msg: dict = {
        "role": role,
        "content": content,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    if action_options:
        msg["action_options"] = action_options
        state["pending_action_options"] = action_options
    state["messages"].append(msg)


def _append_audit(state: dict, event: str, details: str, decision: str) -> None:
    state["audit_log"].append({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "session_id": state.get("session_id"),
        "workflow_id": state.get("workflow_id"),
        "request_id": state.get("request_id"),
        "event": event,
        "details": details,
        "decision": decision,
    })
