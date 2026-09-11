"""
app/services/gemini_service.py

Wraps langchain-google-genai to provide structured Gemini calls.

Rules:
- Model name ALWAYS comes from settings.gemini_model — never hardcoded.
- API key ALWAYS comes from settings.gemini_api_key — never in prompts.
- Document content is ALWAYS passed pre-sanitized (injection_defense applied by caller).
- All responses use structured output (Pydantic schemas) — no free-text parsing.
- This module never imports backend_client — it only calls Gemini.
"""

import logging
from functools import lru_cache

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage

from app.config.settings import get_settings
from app.schemas.document import DocumentAnalysis, DocumentSummaryReport, DocumentSummaryItem

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _get_llm() -> ChatGoogleGenerativeAI:
    """
    Returns the singleton LangChain Gemini LLM instance.
    Model name is read from settings — never hardcoded.
    """
    settings = get_settings()
    return ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        google_api_key=settings.gemini_api_key,
        temperature=0.1,          # low temperature for consistent structured output
        max_retries=2,
        convert_system_message_to_human=True,
    )


class GeminiService:
    """
    High-level Gemini operations used by agent nodes.
    All methods return Pydantic models — no raw strings returned to agents.
    """

    def __init__(self) -> None:
        self._llm = _get_llm()

    async def analyze_document(
        self,
        sanitized_text: str,
        expected_type: str,
        image_base64: str | None = None,
    ) -> DocumentAnalysis:
        """
        Classifies a document and returns a structured DocumentAnalysis.

        Args:
            sanitized_text: Extracted text, already wrapped with injection-defense
                            markers by injection_defense.py. Treat as UNTRUSTED DATA.
            expected_type: The document type the workflow expects (e.g. "NIC").
            image_base64: Optional base64-encoded image for vision analysis.

        Returns:
            DocumentAnalysis — Gemini's structured classification result.
            NOTE: classification_confidence is a score Gemini produces.
                  Python code (document_validation.py) applies the threshold;
                  Gemini cannot override the accept/reject decision.
        """
        from app.prompts.document_analysis import DOCUMENT_ANALYSIS_SYSTEM_PROMPT

        system_msg = SystemMessage(content=DOCUMENT_ANALYSIS_SYSTEM_PROMPT)
        human_content: list = [
            {
                "type": "text",
                "text": (
                    f"Expected document type: {expected_type}\n\n"
                    f"Extracted document content:\n{sanitized_text}"
                ),
            }
        ]

        if image_base64:
            human_content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"},
            })

        human_msg = HumanMessage(content=human_content)

        structured_llm = self._llm.with_structured_output(DocumentAnalysis)
        try:
            result: DocumentAnalysis = await structured_llm.ainvoke([system_msg, human_msg])
            logger.info(
                "Document analysis complete: type=%s confidence=%.2f readable=%s",
                result.document_type,
                result.classification_confidence,
                result.readable,
            )
            return result
        except Exception as e:
            logger.error("Gemini document analysis failed: %s", e)
            # Return a safe fallback — low confidence forces rejection in validation
            return DocumentAnalysis(
                document_type="unknown",
                classification_confidence=0.0,
                readable=False,
                extracted_fields={},
                missing_fields=[],
                issues=[f"Analysis failed: {str(e)[:100]}"],
                requires_human_review=True,
                analysis_summary="Document analysis could not be completed.",
            )

    @staticmethod
    def _extract_text(content: object) -> str:
        """Safely extracts a string from str or LangChain/Gemini content parts."""
        if isinstance(content, str):
            return content.strip()
        if isinstance(content, list):
            parts = []
            for p in content:
                if isinstance(p, str):
                    parts.append(p)
                elif isinstance(p, dict) and "text" in p:
                    parts.append(str(p["text"]))
                elif hasattr(p, "text"):
                    parts.append(str(getattr(p, "text")))
            return "\n".join(parts).strip()
        return str(content).strip()

    async def generate_rejection_message(
        self,
        analysis: DocumentAnalysis,
        expected_doc_type: str,
        retry_count: int,
        max_retries: int,
    ) -> str:
        """
        Generates a specific, helpful rejection message for the client.
        Explains exactly what was wrong and what to do to fix it.
        """
        from app.prompts.validation import REJECTION_MESSAGE_PROMPT

        prompt = (
            f"{REJECTION_MESSAGE_PROMPT}\n\n"
            f"Expected document type: {expected_doc_type}\n"
            f"Detected document type: {analysis.document_type}\n"
            f"Confidence: {analysis.classification_confidence:.0%}\n"
            f"Readable: {analysis.readable}\n"
            f"Issues found: {', '.join(analysis.issues) if analysis.issues else 'none specified'}\n"
            f"This is attempt {retry_count} of {max_retries} maximum.\n\n"
            "Write a short, polite, specific rejection message for the client. "
            "Tell them exactly what was wrong and exactly what to do differently. "
            "End with a clear instruction to re-upload the correct document."
        )

        try:
            response = await self._llm.ainvoke([HumanMessage(content=prompt)])
            return self._extract_text(response.content)
        except Exception as e:
            logger.error("Failed to generate rejection message: %s", e)
            user_friendly_issues = [
                iss for iss in analysis.issues
                if not any(k in iss.lower() for k in ("error", "exception", "failed:", "quota", "resource_exhausted"))
            ]
            issues_text = f"Issues found: {', '.join(user_friendly_issues)}." if user_friendly_issues else "The uploaded file does not appear to be an authentic legal document."
            return (
                f"Your {expected_doc_type} could not be verified. "
                f"{issues_text} "
                f"Please re-upload a clear, readable copy of your {expected_doc_type}."
            )

    async def generate_document_summary_message(
        self,
        report: DocumentSummaryReport,
    ) -> str:
        """
        Generates the friendly summary message shown to the client
        after all documents are verified.
        """
        from app.prompts.document_analysis import SUMMARY_MESSAGE_PROMPT

        doc_lines = []
        for item in report.documents:
            status_str = "✅ Accepted" if not item.flagged else "⚠️ Accepted (flagged for review)"
            flag_note = f" Note: {item.flag_reason}" if item.flag_reason else ""
            doc_lines.append(
                f"- {item.doc_type}: {status_str}, confidence {item.confidence_percent}%, "
                f"{item.attempts} attempt(s).{flag_note}"
            )

        doc_summary = "\n".join(doc_lines)
        prompt = (
            f"{SUMMARY_MESSAGE_PROMPT}\n\n"
            f"Service: {report.service_name}\n"
            f"Request ID: {report.request_id}\n"
            f"Documents verified ({report.total_accepted}/{report.total_required}):\n"
            f"{doc_summary}\n"
            f"Flagged documents: {report.total_flagged}\n\n"
            "Generate a friendly, professional summary message for the client. "
            "Congratulate/greet them warmly, confirm all required documents are verified, "
            "explicitly instruct them to check their Requests page to track real-time progress, "
            "and explain that after the Admin Approval, they will be notified with official updates and next steps. "
            "Keep it concise and reassuring."
        )

        try:
            response = await self._llm.ainvoke([HumanMessage(content=prompt)])
            return self._extract_text(response.content)
        except Exception as e:
            logger.error("Failed to generate summary message: %s", e)
            req_str = f" #{report.request_id}" if report.request_id else ""
            return (
                f"🎉 Congratulations! All {report.total_required} required documents for your {report.service_name} "
                f"request{req_str} have been successfully verified!\n\n"
                "📋 **Next Steps & Real-Time Tracking:**\n"
                "• **Check Your Requests Page:** You can track your request status and review progress on your **Requests page** at any time.\n"
                "• **Admin Approval & Notification:** Your application has been submitted for review. **After the Admin Approval, you will be notified** of the decision and next steps."
            )

    async def classify_message_relevance(
        self,
        message: str,
        current_phase: str,
        service_name: str,
    ) -> tuple[bool, str]:
        """
        Determines if a client message is relevant to the current workflow.

        Returns:
            (is_relevant: bool, redirect_message: str)
        """
        from app.prompts.supervisor import OFF_TOPIC_CLASSIFICATION_PROMPT

        prompt = (
            f"{OFF_TOPIC_CLASSIFICATION_PROMPT}\n\n"
            f"Current workflow phase: {current_phase}\n"
            f"Current service: {service_name}\n"
            f"Client message: {message}\n\n"
            "Respond with JSON: "
            '{"is_relevant": true/false, "redirect_message": "..." }\n'
            "redirect_message is only needed if is_relevant is false."
        )

        try:
            response = await self._llm.ainvoke([HumanMessage(content=prompt)])
            text = self._extract_text(response.content)
            if text.startswith("```"):
                lines = text.splitlines()
                if lines and lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                text = "\n".join(lines).strip()
            import json
            data = json.loads(text)
            return data.get("is_relevant", True), data.get("redirect_message", "")
        except Exception as e:
            logger.warning("Off-topic classification failed, defaulting to relevant: %s", e)
            return True, ""

    async def match_service_intent(
        self,
        user_text: str,
        available_services: list[dict],
    ) -> int | None:
        """
        Uses Gemini to determine which available legal service the user is asking for.
        Returns the matching serviceId (int) or None if no available service matches.
        """
        if not user_text or not available_services:
            return None

        services_summary = []
        for s in available_services:
            sid = s.get("serviceId") or s.get("service_id")
            sname = s.get("name", "")
            sdesc = s.get("description", "")
            services_summary.append(f"- ID {sid}: '{sname}' ({sdesc})")

        prompt = (
            "You are a classifier matching a user's inquiry to a legal service catalog.\n\n"
            f"User input: \"{user_text}\"\n\n"
            "Available legal services:\n"
            + "\n".join(services_summary) + "\n\n"
            "Identify if the user is asking for or intending one of these available services.\n"
            "- If they match or describe one of the services (e.g., company formation -> Corporate Registration, land deed -> Property Transfer), respond with JSON: {\"matched_service_id\": <ID>}\n"
            "- If they ask for something not offered in the list (e.g., rental agreement, divorce, pizza), respond with: {\"matched_service_id\": null}\n"
            "- If they are asking a generic question like 'what documents do I need', respond with: {\"matched_service_id\": null}\n\n"
            "Respond ONLY with valid JSON: {\"matched_service_id\": int or null}"
        )

        try:
            response = await self._llm.ainvoke([HumanMessage(content=prompt)])
            text = self._extract_text(response.content)
            if text.startswith("```"):
                lines = text.splitlines()
                if lines and lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                text = "\n".join(lines).strip()
            import json
            data = json.loads(text)
            matched_id = data.get("matched_service_id")
            if matched_id is not None:
                return int(matched_id)
        except Exception as e:
            logger.warning("LLM service intent classification failed: %s", e)
        return None

    async def answer_general_inquiry(
        self,
        user_text: str,
        available_services: list[dict],
        client_name: str | None = None,
        pending_question: str | None = None,
        recent_messages: list[dict] | None = None,
        is_authenticated: bool = True,
    ) -> dict:
        """
        Handles general questions, user identity/name interactions, legal explanations,
        and conversational guidance when the user has not directly picked a service yet.
        """
        services_summary = []
        for s in available_services:
            sname = s.get("name", "")
            sdesc = s.get("description", "")
            services_summary.append(f"  • {sname}: {sdesc}")

        history_summary = []
        for m in (recent_messages or [])[-6:]:
            role = "User" if m.get("role") == "client" else "Assistant"
            history_summary.append(f"{role}: {m.get('content', '')}")

        auth_context = "Client is authenticated and signed in." if is_authenticated else (
            "Client is an UNAUTHENTICATED GUEST. The guest CAN ask questions and learn about any legal topic or service requirements freely. "
            "HOWEVER, if they ask to formally submit a request, apply for a service, or upload documents, you MUST strictly tell them to sign in to make an official request."
        )

        prompt = (
            "You are a warm, highly intelligent, and professional Legal AI Documentation Assistant.\n\n"
            f"Context:\n"
            f"- Known Client Name: {client_name or 'None'}\n"
            f"- User Auth Status: {auth_context}\n"
            f"- Pending Agent Question: {pending_question or 'None'}\n"
            f"- Available Legal Services:\n"
            + "\n".join(services_summary) + "\n\n"
            f"Recent Conversation:\n"
            + ("\n".join(history_summary) if history_summary else "No prior messages.") + "\n\n"
            f"Latest User Message: \"{user_text}\"\n\n"
            "Instructions:\n"
            "0. UNDERSTAND CLIENT REQUEST FIRST:\n"
            "   - Always explicitly understand and acknowledge what the client is asking about before providing details or options.\n"
            "   - If client asks about a legal problem (e.g. bail, divorce, notice, contract dispute, deed, property, will):\n"
            "     * Provide a clear, supportive, and legally accurate explanation under Sri Lankan legal practice.\n"
            "     * Break explanations into clean numbered steps ('1. ', '2. ') or bullet points ('• ').\n"
            "     * Explain how our relevant legal service can help them.\n"
            "     * Conclude by asking if they would like to proceed with that service.\n"
            "   - If client asks 'What are acceptable documents?' or asks about samples:\n"
            "     * Provide a clear bulleted breakdown of acceptable documents:\n"
            "       • **National Identity Card (NIC)**: Valid front & back photo/scan with legible NIC number and photo.\n"
            "       • **Title Deeds & Survey Plans**: Certified registry extract or clear scan with registry deed number and seal.\n"
            "       • **Affidavits & Declarations**: Signed by deponent and attested by an Attorney-at-Law or JP.\n"
            "       • **Agreements & Contracts**: Complete pages with signatures and witness details.\n"
            "       • **Official Certificates**: Certified official copies (Marriage, Death, or Grama Niladhari).\n"
            "1. If user asks 'do you know my name', 'tell me my name', or asks about their identity:\n"
            "   - If Known Client Name is set, warmly confirm their name with bold formatting: e.g. 'Yes! Your name is **{client_name}**! How can I assist you with your legal matters today?'.\n"
            "   - If Known Client Name is None, explain politely that you don't know their name yet and ask for it: 'I don't believe I have had the pleasure of learning your name yet.\n\nMay I ask what your name is?'. Set 'asks_user_question': 'ASKING_NAME'.\n"
            "2. If user shares their name (e.g., 'My name is Vithusan', 'I am Vithusan', or answers ASKING_NAME):\n"
            "   - Extract their clean name into 'extracted_client_name' (e.g., 'Vithusan').\n"
            "   - Greet them warmly using their bolded name (e.g., 'It's a pleasure to meet you, **Vithusan**!').\n"
            "   - Ask what legal service or document assistance they need today. Tell them they can select from the suggestions below or describe their need.\n"
            "   - DO NOT list all services unless they explicitly asked to see all services.\n"
            "3. ONLY if client explicitly asks to see, display, or list all services (e.g. 'display all services', 'show all services', 'list all services', 'what services do you offer', 'view all services'):\n"
            "   - Present all available legal services as clean vertical bullet points (`• **Service Name**: Description`) using the Available Legal Services list.\n"
            "   - Ask which service they would like to proceed with.\n"
            "4. If user asks general questions (e.g. 'What documents do I need to submit?', 'How does this work?', 'Who are you?', or questions about Sri Lankan law):\n"
            "   - Answer thoroughly, accurately, and professionally.\n"
            "   - Use clean vertical bullet points or numbered lists (`1. `, `2. `).\n"
            "   - Do NOT dump the full service catalog. Ask what specific service they need assistance with.\n"
            "4. If user asks to make an official request, apply, or register while unauthenticated (Guest):\n"
            "   - Politely inform them of the requirements and strictly instruct them: 'To officially make a request and have our clerks process your documents, you must sign in to your account. Please log in or register to submit an official request.'\n"
            "5. If user explicitly confirms they want to start, apply, or create a request for a service:\n"
            "   - Set 'matched_service_name': '<exact service name from Available Legal Services>'.\n"
            "   - If they are only asking questions or seeking information without saying they want to start/apply, keep 'matched_service_name': null.\n\n"
            "CRITICAL FORMATTING MANDATES FOR 'reply':\n"
            "- EVERY response must be properly structured in clean Markdown. NEVER write dense unformatted text.\n"
            "- ALWAYS highlight client names and service names in **bold**.\n"
            "- Whenever presenting multiple services, choices, or steps, ALWAYS use vertical bullet points (`• **Item**`) or numbers (`1. `, `2. `). Do NOT join them into one long sentence.\n"
            "- Separate paragraphs with a blank line (`\\n\\n`) for readability.\n\n"
            "Respond ONLY with valid JSON in this format:\n"
            "{\n"
            "  \"reply\": \"<your warm, properly formatted response>\",\n"
            "  \"extracted_client_name\": <string or null>,\n"
            "  \"asks_user_question\": <\"ASKING_NAME\" or null>,\n"
            "  \"matched_service_name\": <string or null>\n"
            "}"
        )

        try:
            response = await self._llm.ainvoke([HumanMessage(content=prompt)])
            text = self._extract_text(response.content)
            if text.startswith("```"):
                lines = text.splitlines()
                if lines and lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                text = "\n".join(lines).strip()
            import json
            data = json.loads(text)
            return {
                "reply": data.get("reply", "How can I assist you with our legal services today?"),
                "extracted_client_name": data.get("extracted_client_name"),
                "asks_user_question": data.get("asks_user_question"),
                "matched_service_name": data.get("matched_service_name"),
            }
        except Exception as e:
            logger.warning("Gemini general inquiry failed: %s", e)
            name_greet = f", {client_name}" if client_name else ""
            return {
                "reply": f"Hello{name_greet}! I am your Legal AI Assistant. How can I assist you with our legal services today?",
                "extracted_client_name": None,
                "asks_user_question": None,
                "matched_service_name": None,
            }

    async def recommend_clerk(
        self,
        candidates: list[dict],
        service_name: str,
        request_context: str,
    ) -> "ClerkRecommendation":
        """
        Explains which clerk is best suited and why.
        Gemini EXPLAINS — it does NOT assign. The admin makes the final decision.
        """
        from app.prompts.clerk import CLERK_RECOMMENDATION_PROMPT
        from app.schemas.clerk import ClerkRecommendation

        candidate_lines = []
        for c in candidates:
            candidate_lines.append(
                f"- Clerk ID {c['clerk_id']}: {c['name']}, "
                f"Department: {c['department']}, "
                f"Active requests: {c['active_request_count']}"
            )

        prompt = (
            f"{CLERK_RECOMMENDATION_PROMPT}\n\n"
            f"Service being requested: {service_name}\n"
            f"Context: {request_context}\n"
            f"Available clerks:\n" + "\n".join(candidate_lines)
        )

        structured_llm = self._llm.with_structured_output(ClerkRecommendation)
        try:
            result: ClerkRecommendation = await structured_llm.ainvoke(
                [HumanMessage(content=prompt)]
            )
            logger.info(
                "Clerk recommendation: clerk_id=%s confidence=%.2f",
                result.recommended_clerk_id,
                result.confidence,
            )
            return result
        except Exception as e:
            logger.error("Clerk recommendation failed: %s", e)
            # If recommendation fails and there are candidates, pick lowest workload
            if candidates:
                best = min(candidates, key=lambda c: c["active_request_count"])
                from app.schemas.clerk import ClerkRecommendation
                return ClerkRecommendation(
                    recommended_clerk_id=str(best["clerk_id"]),
                    reason="Selected based on lowest active workload (recommendation engine fallback).",
                    confidence=0.5,
                    alternatives=[],
                )
            raise


# Module-level singleton
@lru_cache(maxsize=1)
def get_gemini_service() -> GeminiService:
    return GeminiService()
