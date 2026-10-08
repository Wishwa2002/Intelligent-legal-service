from datetime import datetime, timezone
from .state import CoordinatorState
def detect_legal_category(text: str) -> str:
    text = text.lower()

    if any(k in text for k in [
        "land",
        "property",
        "rent",
        "tenant",
        "deed",
        "lease",
        "ownership",
    ]):
        return "Real Estate & Property Law"

    if any(k in text for k in [
        "arrest",
        "police",
        "criminal",
        "bail",
        "assault",
        "theft",
        "court",
    ]):
        return "Criminal Law"

    if any(k in text for k in [
        "job",
        "employment",
        "salary",
        "dismissed",
        "workplace",
        "epf",
        "gratuity",
    ]):
        return "Labour & Employment Law"

    if any(k in text for k in [
        "tax",
        "vat",
        "ird",
        "revenue",
        "customs",
    ]):
        return "Tax Law"

    if any(k in text for k in [
        "company",
        "business",
        "shares",
        "director",
        "incorporation",
        "commercial",
    ]):
        return "Corporate & Commercial Law"

    return "General Law"

async def planner_node(state: CoordinatorState) -> CoordinatorState:
    state = dict(state)

    text = (
        f"{state.get('title', '')} "
        f"{state.get('description', '')} "
        f"{state.get('request_type', '')}"
    ).lower()

    state["legal_category"] = detect_legal_category(text)
    
    plan = []
    order = 1

    # Lawyer recommendation
    if any(word in text for word in [
        "lawyer",
        "legal advice",
        "legal help",
        "consultation",
        "attorney",
    ]):
        plan.append({
            "order": order,
            "agent": "LawyerRecommendationAgent",
            "action": "recommend_lawyers",
            "status": "Pending",
        })
        order += 1

    # Scheduling
    if any(word in text for word in [
        "appointment",
        "schedule",
        "meeting",
        "meet",
        "consultation",
    ]):
        plan.append({
            "order": order,
            "agent": "SchedulingAgent",
            "action": "find_available_slots",
            "status": "Pending",
        })
        order += 1

    # Documentation
    if any(word in text for word in [
        "document",
        "agreement",
        "affidavit",
        "deed",
        "certificate",
        "contract",
        "notary",
    ]):
        plan.append({
            "order": order,
            "agent": "DocumentationClerkAgent",
            "action": "analyze_document_requirements",
            "status": "Pending",
        })
        order += 1

    # Always validate
    plan.append({
        "order": order,
        "agent": "PlanningCoordinatorAgent",
        "action": "validate_results",
        "status": "Pending",
    })
    order += 1

    # Always require approval
    plan.append({
        "order": order,
        "agent": "PlanningCoordinatorAgent",
        "action": "request_human_approval",
        "status": "Pending",
    })

    state["plan"] = plan
    state["current_step"] = 0

    state.setdefault("trace", []).append({
        "event": "PLAN_CREATED",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "steps": len(plan),
    })

    return state