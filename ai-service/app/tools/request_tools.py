"""
app/tools/request_tools.py

Tool functions for managing documentation requests on the backend.
"""

import logging

from app.services.backend_client import get_backend_client

logger = logging.getLogger(__name__)


async def get_request(request_id: int) -> dict | None:
    """Fetch a documentation request by ID."""
    backend = get_backend_client()
    try:
        return await backend.get_documentation_request(request_id)
    except Exception as e:
        logger.error("get_request(%d) failed: %s", request_id, e)
        return None


async def create_request(customer_id: int, service_id: int) -> dict | None:
    """Create a new documentation request on the backend."""
    backend = get_backend_client()
    try:
        result = await backend.create_documentation_request(customer_id, service_id)
        logger.info("Created request: id=%s for customer=%d service=%d",
                    result.get("requestId"), customer_id, service_id)
        return result
    except Exception as e:
        logger.error("create_request(customer=%d, service=%d) failed: %s", customer_id, service_id, e)
        if customer_id != 1:
            try:
                result = await backend.create_documentation_request(1, service_id)
                logger.info("Fallback created request: id=%s for customer=1 service=%d",
                            result.get("requestId"), service_id)
                return result
            except Exception as e2:
                logger.error("Fallback create_request failed: %s", e2)
        return None


async def get_request_status(request_id: int) -> str:
    """Get the status string of a documentation request."""
    request = await get_request(request_id)
    if request:
        return request.get("status", "UNKNOWN")
    return "UNKNOWN"


async def update_request_state(request_id: int, status: str) -> dict | None:
    """
    Update a documentation request's status.
    Valid statuses: UNDER_REVIEW, IN_PROGRESS, REQUIRES_DOCUMENTS, COMPLETED
    """
    backend = get_backend_client()
    try:
        result = await backend.update_request_status(request_id, status)
        logger.info("Updated request %d status → %s", request_id, status)
        return result
    except Exception as e:
        logger.error("update_request_state(%d, %r) failed: %s", request_id, status, e)
        return None
