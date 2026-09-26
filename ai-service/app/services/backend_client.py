"""
app/services/backend_client.py

Single HTTPX async client for ALL calls to the ASP.NET Core backend.

Rules:
- This is the ONLY module in the codebase that imports httpx.
- Every method returns typed data (dict / list / bytes).
- No other module calls the backend directly — they go through here.
- The AI service never touches PostgreSQL. All data comes through these methods.
- All requests include the X-AI-Service-Key header for backend authentication.
- On error, raises BackendClientError with a structured message (no raw stack traces to callers).
"""

import logging
from typing import Any

import httpx

from app.config.settings import get_settings

logger = logging.getLogger(__name__)


class BackendClientError(Exception):
    """Raised when the ASP.NET backend returns an error or is unreachable."""

    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


class BackendClient:
    """
    Async HTTP client for the ASP.NET Core Legal Service API.
    Instantiate once and reuse (or use as a dependency-injected singleton).
    """

    def __init__(self) -> None:
        settings = get_settings()
        self._base_url = settings.backend_api_url.rstrip("/")
        # X-AI-Service-Key header — value is the shared secret, never logged.
        self._headers = {
            "Content-Type": "application/json",
            "X-AI-Service-Key": settings.ai_service_api_key,
        }
        self._client = httpx.AsyncClient(
            base_url=self._base_url,
            headers=self._headers,
            timeout=30.0,
        )

    async def _get(self, path: str, params: dict | None = None) -> Any:
        try:
            r = await self._client.get(path, params=params)
            r.raise_for_status()
            return r.json()
        except httpx.HTTPStatusError as e:
            raise BackendClientError(
                f"GET {path} failed with HTTP {e.response.status_code}",
                status_code=e.response.status_code,
            ) from e
        except httpx.RequestError as e:
            raise BackendClientError(f"GET {path} — backend unreachable: {e}") from e

    async def _post(self, path: str, body: dict) -> Any:
        try:
            r = await self._client.post(path, json=body)
            r.raise_for_status()
            return r.json()
        except httpx.HTTPStatusError as e:
            raise BackendClientError(
                f"POST {path} failed with HTTP {e.response.status_code}",
                status_code=e.response.status_code,
            ) from e
        except httpx.RequestError as e:
            raise BackendClientError(f"POST {path} — backend unreachable: {e}") from e

    async def _put(self, path: str, body: dict | None = None, params: dict | None = None) -> Any:
        try:
            r = await self._client.put(path, json=body, params=params)
            r.raise_for_status()
            return r.json()
        except httpx.HTTPStatusError as e:
            raise BackendClientError(
                f"PUT {path} failed with HTTP {e.response.status_code}",
                status_code=e.response.status_code,
            ) from e
        except httpx.RequestError as e:
            raise BackendClientError(f"PUT {path} — backend unreachable: {e}") from e

    # ================================================================
    # Documentation Services
    # ================================================================

    async def get_all_services(self, include_inactive: bool = False) -> list[dict]:
        """GET /api/documentation-services"""
        return await self._get("/api/documentation-services", params={"includeInactive": include_inactive})

    async def get_documentation_service(self, service_id: int) -> dict:
        """GET /api/documentation-services/{id}
        Returns service with RequiredDocuments as a JSON string (parsed by service_tools).
        """
        return await self._get(f"/api/documentation-services/{service_id}")

    # ================================================================
    # Documentation Requests
    # ================================================================

    async def get_documentation_request(self, request_id: int) -> dict:
        """GET /api/documentation-requests/{id}"""
        return await self._get(f"/api/documentation-requests/{request_id}")

    async def get_all_requests(
        self,
        customer_id: int | None = None,
        clerk_id: int | None = None,
        status: str | None = None,
    ) -> list[dict]:
        """GET /api/documentation-requests with optional filters."""
        params: dict = {}
        if customer_id is not None:
            params["customerId"] = customer_id
        if clerk_id is not None:
            params["clerkId"] = clerk_id
        if status is not None:
            params["status"] = status
        return await self._get("/api/documentation-requests", params=params)

    async def create_documentation_request(self, customer_id: int, service_id: int) -> dict:
        """POST /api/documentation-requests?customerId={id}"""
        body = {"serviceId": service_id, "documentType": "Initial Application", "status": "UNDER_REVIEW"}
        try:
            r = await self._client.post(
                "/api/documentation-requests",
                json=body,
                params={"customerId": customer_id},
                timeout=15.0,
            )
            r.raise_for_status()
            return r.json()
        except httpx.HTTPStatusError as e:
            raise BackendClientError(
                f"Create request failed with HTTP {e.response.status_code}",
                status_code=e.response.status_code,
            ) from e
        except httpx.RequestError as e:
            raise BackendClientError(f"Create request — backend unreachable: {e}") from e

    async def update_request_status(self, request_id: int, status: str) -> dict:
        """PUT /api/documentation-requests/{id}/status"""
        return await self._put(
            f"/api/documentation-requests/{request_id}/status",
            body={"status": status},
        )

    async def assign_clerk(self, request_id: int, clerk_id: int) -> dict:
        """POST /api/documentation-requests/{id}/assign-clerk
        NOTE: The AI service never calls this directly.
        This is called only after admin approval is confirmed by the backend.
        It is included here for completeness and potential future use.
        """
        return await self._post(
            f"/api/documentation-requests/{request_id}/assign-clerk",
            body={"clerkId": clerk_id},
        )

    # ================================================================
    # Document Files
    # ================================================================

    async def get_document_files(self, request_id: int) -> list[dict]:
        """GET /api/documentation-requests/{requestId}/files"""
        return await self._get(f"/api/documentation-requests/{request_id}/files")

    async def download_document_file(self, file_id: int) -> bytes:
        """GET /api/document-files/{id}/download — returns raw bytes."""
        try:
            r = await self._client.get(f"/api/document-files/{file_id}/download")
            r.raise_for_status()
            return r.content
        except httpx.HTTPStatusError as e:
            raise BackendClientError(
                f"Download file {file_id} failed with HTTP {e.response.status_code}",
                status_code=e.response.status_code,
            ) from e
        except httpx.RequestError as e:
            raise BackendClientError(f"Download file {file_id} — backend unreachable: {e}") from e

    async def get_document_file_metadata(self, file_id: int) -> dict:
        """GET /api/document-files/{id}"""
        return await self._get(f"/api/document-files/{file_id}")

    async def update_file_status(self, file_id: int, status: str) -> dict:
        """PUT /api/document-files/{id}/status?status={status}
        Valid statuses: Received | UnderReview | Accepted | Rejected
        """
        return await self._put(
            f"/api/document-files/{file_id}/status",
            params={"status": status},
        )

    async def upload_document_file(
        self,
        request_id: int,
        filename: str,
        content: bytes,
        content_type: str = "application/pdf",
    ) -> dict | None:
        """POST /api/documentation-requests/{requestId}/files"""
        files = {"file": (filename, content, content_type)}
        try:
            headers = {"X-AI-Service-Key": self._headers.get("X-AI-Service-Key", "")}
            async with httpx.AsyncClient(base_url=self._base_url, headers=headers, timeout=30.0) as client:
                r = await client.post(f"/api/documentation-requests/{request_id}/files", files=files)
                r.raise_for_status()
                return r.json()
        except Exception as e:
            logger.warning("Failed to upload document file to backend request %d: %s", request_id, e)
            return None

    # ================================================================
    # Clerks
    # ================================================================

    async def get_all_clerks(self) -> list[dict]:
        """GET /api/clerks"""
        return await self._get("/api/clerks")

    async def get_clerk(self, clerk_id: int) -> dict:
        """GET /api/clerks/{id}"""
        return await self._get(f"/api/clerks/{clerk_id}")

    async def get_clerk_requests(self, clerk_id: int) -> list[dict]:
        """GET /api/clerks/{id}/requests — used to compute workload (count of active requests)."""
        return await self._get(f"/api/clerks/{clerk_id}/requests")

    # ================================================================
    # Users / Auth
    # ================================================================

    async def get_user(self, user_id: int) -> dict | None:
        """GET /api/auth/user/{id} — fetches registered user profile."""
        try:
            return await self._get(f"/api/auth/user/{user_id}")
        except Exception:
            return None

    # ================================================================
    # Lawyers & Scheduling
    # ================================================================

    async def get_lawyers(
        self,
        specialization: str | None = None,
        search: str | None = None,
    ) -> list[dict]:
        """GET /api/lawyers with optional specialization and text search filters."""
        params: dict = {}
        if specialization:
            params["specialization"] = specialization
        if search:
            params["search"] = search
        return await self._get("/api/lawyers", params=params if params else None)

    async def get_lawyer(self, lawyer_id: str) -> dict:
        """GET /api/lawyers/{id}"""
        return await self._get(f"/api/lawyers/{lawyer_id}")

    async def get_available_slots(self, lawyer_id: str, date: str) -> list[dict]:
        """GET /api/appointments/available-slots?lawyerId={id}&date={date}"""
        return await self._get(
            "/api/appointments/available-slots",
            params={"lawyerId": lawyer_id, "date": date},
        )

    async def check_schedule_conflict(
        self,
        lawyer_id: str,
        date: str,
        start_time: str,
        end_time: str,
        exclude_appointment_id: str | None = None,
    ) -> bool:
        """GET /api/appointments/check-conflict"""
        params = {
            "lawyerId": lawyer_id,
            "date": date,
            "startTime": start_time,
            "endTime": end_time,
        }
        if exclude_appointment_id:
            params["excludeAppointmentId"] = exclude_appointment_id
        res = await self._get("/api/appointments/check-conflict", params=params)
        return bool(res) if isinstance(res, bool) else bool(res.get("conflict", False) if isinstance(res, dict) else False)

    async def book_appointment(
        self,
        lawyer_id: str,
        customer_id: str,
        slot_id: str,
        consultation_type: str = "Meeting with a Lawyer",
        description: str | None = None,
        notes: str | None = None,
        legal_service_category: str | None = None,
    ) -> dict:
        """POST /api/appointments"""
        cid = str(customer_id).strip()
        if not cid or cid.lower() == "guest":
            formatted_cid = "00000000-0000-0000-0000-000000000001"
        elif "-" in cid and len(cid) == 36:
            formatted_cid = cid
        else:
            try:
                num = int(cid)
                formatted_cid = f"00000000-0000-0000-0000-{num:012x}"
            except Exception:
                formatted_cid = "00000000-0000-0000-0000-000000000001"

        body = {
            "lawyerId": lawyer_id,
            "customerId": formatted_cid,
            "slotId": slot_id,
            "consultationType": consultation_type,
            "description": description or "",
            "notes": notes or "",
            "legalServiceCategory": legal_service_category or "",
        }
        return await self._post("/api/appointments", body=body)

    async def get_appointments(
        self,
        lawyer_id: str | None = None,
        customer_id: str | None = None,
        status: str | None = None,
        date: str | None = None,
        lawyer_email: str | None = None,
    ) -> list[dict]:
        """GET /api/appointments with optional filters."""
        params: dict = {}
        if lawyer_id:
            params["lawyerId"] = lawyer_id
        if customer_id:
            params["customerId"] = customer_id
        if status:
            params["status"] = status
        if date:
            params["date"] = date
        if lawyer_email:
            params["lawyerEmail"] = lawyer_email
        return await self._get("/api/appointments", params=params if params else None)

    async def get_appointment_by_id(self, appointment_id: str) -> dict:
        """GET /api/appointments/{id}"""
        return await self._get(f"/api/appointments/{appointment_id}")

    async def reschedule_appointment(
        self,
        appointment_id: str,
        new_slot_id: str,
        reason: str | None = None,
    ) -> dict:
        """POST /api/appointments/{id}/reschedule"""
        body = {"newSlotId": new_slot_id, "reason": reason or "Rescheduled via AI Scheduling Assistant"}
        return await self._post(f"/api/appointments/{appointment_id}/reschedule", body=body)

    async def cancel_appointment(
        self,
        appointment_id: str,
        reason: str | None = None,
    ) -> dict:
        """POST /api/appointments/{id}/cancel"""
        body = {"reason": reason or "Cancelled via AI Scheduling Assistant"}
        return await self._post(f"/api/appointments/{appointment_id}/cancel", body=body)

    # ================================================================
    # Lifecycle
    # ================================================================

    async def close(self) -> None:
        """Close the underlying HTTPX client. Call on app shutdown."""
        await self._client.aclose()


# ---------------------------------------------------------------------------
# Module-level singleton — used as a FastAPI dependency
# ---------------------------------------------------------------------------
_backend_client: BackendClient | None = None


def get_backend_client() -> BackendClient:
    """FastAPI dependency: returns the shared BackendClient instance."""
    global _backend_client
    if _backend_client is None:
        _backend_client = BackendClient()
    return _backend_client
