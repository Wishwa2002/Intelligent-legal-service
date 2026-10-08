"""
app/tools/service_tools.py

Tool functions for fetching service configuration from the backend.

These are the ONLY functions that provide document requirements to the agent.
The AI NEVER invents what documents are required — it always fetches them here.
"""

import json
import logging
import re

from app.services.backend_client import get_backend_client

logger = logging.getLogger(__name__)


async def get_all_services() -> list[dict]:
    """Fetch all active documentation services from the backend."""
    backend = get_backend_client()
    return await backend.get_all_services(include_inactive=False)


async def get_service_requirements(service_id: int) -> list[str]:
    """
    Fetch the required document types for a service.
    Handles both direct list[str] and JSON string representations from backend.
    """
    backend = get_backend_client()
    try:
        service = await backend.get_documentation_service(service_id)
        raw = service.get("requiredDocuments")
        if raw is None:
            raw = service.get("RequiredDocuments", [])

        if isinstance(raw, list):
            docs = raw
        elif isinstance(raw, str):
            docs = json.loads(raw)
        else:
            docs = []

        if not isinstance(docs, list):
            logger.error("requiredDocuments for service %d is not a list: %r", service_id, raw)
            return []
        logger.info("Service %d requires: %s", service_id, docs)
        return [str(d).strip() for d in docs if d]
    except Exception as e:
        logger.error("Failed to fetch service requirements for service_id=%d: %s", service_id, e)
        return []


async def find_service_by_name(name: str) -> dict | None:
    """
    Find a service by name (case-insensitive partial match, keyword overlap, or Gemini semantic intent).
    Used when the client describes what they need in natural language.
    Returns the first matching service dict, or None.
    """
    if not name:
        return None

    name_lower = name.lower()
    services = await get_all_services()
    if not services:
        return None

    # 1. Direct synonym matching for high-precision natural language detection
    synonyms = {
        # Letter of Demand
        "letter of demand": "Letter of Demand (Legal Notice)",
        "legal notice": "Letter of Demand (Legal Notice)",
        "demand letter": "Letter of Demand (Legal Notice)",
        "recovery notice": "Letter of Demand (Legal Notice)",
        # Bail & Criminal
        "bail application": "Bail Application & Criminal Representation",
        "criminal representation": "Bail Application & Criminal Representation",
        "bail": "Bail Application & Criminal Representation",
        "criminal defense": "Bail Application & Criminal Representation",
        # Civil Plaint & Injunction
        "civil plaint": "Civil Plaint & Injunction Filing",
        "injunction filing": "Civil Plaint & Injunction Filing",
        "interim injunction": "Civil Plaint & Injunction Filing",
        "district court plaint": "Civil Plaint & Injunction Filing",
        # Title Search & Pedigree
        "title search": "Title Search & Pedigree Due Diligence",
        "pedigree": "Title Search & Pedigree Due Diligence",
        "day book search": "Title Search & Pedigree Due Diligence",
        "title examination": "Title Search & Pedigree Due Diligence",
        "land registry search": "Title Search & Pedigree Due Diligence",
        # Contract Vetting & NDA
        "contract vetting": "Contract Vetting & Corporate NDA Drafting",
        "nda": "Contract Vetting & Corporate NDA Drafting",
        "non disclosure": "Contract Vetting & Corporate NDA Drafting",
        "corporate nda": "Contract Vetting & Corporate NDA Drafting",
        "agreement vetting": "Contract Vetting & Corporate NDA Drafting",
        # Testamentary & Probate
        "testamentary": "Testamentary & Probate Court Application",
        "probate": "Testamentary & Probate Court Application",
        "letters of administration": "Testamentary & Probate Court Application",
        "probate court": "Testamentary & Probate Court Application",
        # Mutual Divorce & Custody
        "mutual divorce": "Mutual Divorce & Custody Settlement",
        "divorce settlement": "Mutual Divorce & Custody Settlement",
        "custody settlement": "Mutual Divorce & Custody Settlement",
        "divorce": "Mutual Divorce & Custody Settlement",
        # Corporate Registration
        "business registration": "Business & Corporate Registration",
        "corporate registration": "Business & Corporate Registration",
        "company registration": "Business & Corporate Registration",
        "register business": "Business & Corporate Registration",
        "register company": "Business & Corporate Registration",
        # Rental & Lease
        "rental agreement": "Rental & Lease Agreement",
        "lease agreement": "Rental & Lease Agreement",
        "tenancy agreement": "Rental & Lease Agreement",
        "commercial lease": "Rental & Lease Agreement",
        # Power of Attorney
        "power of attorney": "Power of Attorney",
        "poa": "Power of Attorney",
        "appoint attorney": "Power of Attorney",
        # Last Will
        "last will": "Last Will and Testament",
        "will and testament": "Last Will and Testament",
        "draft will": "Last Will and Testament",
        # Property Transfer
        "property transfer": "Property Transfer",
        "transfer property": "Property Transfer",
        "deed transfer": "Property Transfer",
    }
    for keyword, target_service_name in synonyms.items():
        if re.search(rf"\b{re.escape(keyword)}\b", name_lower):
            for s in services:
                if s.get("name", "").lower() == target_service_name.lower():
                    return s

    # 2. Exact or clean substring match (require min 6 characters to prevent trivial matches)
    for service in services:
        service_name = service.get("name", "").lower()
        if service_name and len(name_lower) >= 6:
            if service_name == name_lower or f" {service_name} " in f" {name_lower} ":
                return service

    # 3. Multi-token overlap (require at least 2 distinct words)
    input_tokens = set(re.findall(r"\b\w+\b", name_lower))
    stop_words = {
        "i", "want", "to", "a", "an", "the", "new", "need", "help", "with",
        "for", "please", "my", "some", "what", "documents", "do", "submit",
        "can", "you", "tell", "me", "about", "how", "is", "are", "and", "or",
        "in", "on", "at", "of", "get", "make", "create", "start", "legal", "service"
    }
    significant_tokens = input_tokens - stop_words

    best_service = None
    max_overlap = 0

    for service in services:
        service_name = service.get("name", "").lower()
        service_tokens = set(re.findall(r"\b\w+\b", service_name)) - stop_words
        overlap = len(significant_tokens & service_tokens)
        if overlap > max_overlap:
            max_overlap = overlap
            best_service = service

    if max_overlap >= 2:
        return best_service

    # 3. Gemini semantic intent matching (e.g., "business setup" -> Corporate Registration)
    try:
        from app.services.gemini_service import get_gemini_service
        gemini = get_gemini_service()
        matched_id = await gemini.match_service_intent(name, services)
        if matched_id is not None:
            for s in services:
                sid = s.get("serviceId") or s.get("service_id")
                if sid == matched_id:
                    return s
    except Exception as e:
        logger.warning("Gemini service match error: %s", e)

    return None


# Alias for clarity in agent code
get_required_documents = get_service_requirements
