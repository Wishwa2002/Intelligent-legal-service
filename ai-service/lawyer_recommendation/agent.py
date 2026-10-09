"""Grounded lawyer discovery: Gemini parses language; Python owns every decision."""
from __future__ import annotations

from datetime import date
from typing import Protocol, TypedDict

from langgraph.graph import END, START, StateGraph
from pydantic import ValidationError
from .gemini import ParsedRequirement


class PlatformData(Protocol):
    async def catalogs(self) -> tuple[list[dict], list[dict]]: ...
    async def candidates(self, specialization_ids: list[int], date: str | None = None) -> list[dict]: ...


class Classifier(Protocol):
    async def classify(self, requirement: str, categories: list[dict], services: list[dict]) -> dict: ...


class InvalidClassification(ValueError):
    pass


class State(TypedDict, total=False):
    requirement: str
    date: str | None
    limit: int
    parsedRequirement: dict
    specialization_ids: list[int]
    candidates: list[dict]
    recommendations: list[dict]
    warnings: list[str]
    trace: list[dict]
    status: str


def build_recommendation_graph(data: PlatformData, classifier: Classifier | None = None):
    if classifier is None:
        from .gemini import GeminiClassifier
        classifier = GeminiClassifier()

    async def parse_requirement(state: State):
        categories, services = await data.catalogs()
        raw = await classifier.classify(state['requirement'], categories, services)
        try:
            # Reject extra fields (including lawyer/customer/slot IDs) at the graph boundary too.
            parsed = ParsedRequirement.model_validate(raw, strict=True, extra='forbid').model_dump()
        except ValidationError:
            raise InvalidClassification('Invalid structured legal interpretation') from None
        return {'parsedRequirement': parsed, 'trace': [{'step': 'parse_requirement', 'status': 'completed'}]}

    async def validate_category(state: State):
        categories, services = await data.catalogs()
        parsed = state['parsedRequirement']
        category_id = parsed.get('categoryId')
        category_name = parsed.get('categoryName')
        if category_id is not None:
            matches = [c for c in categories if c['id'] == category_id and c['name'] == category_name]
            if len(matches) != 1:
                raise InvalidClassification('Gemini selected a category outside the current catalog')
        elif category_name is not None:
            raise InvalidClassification('Category name must be paired with a real category ID')
        service_id = parsed.get('legalServiceId')
        service_name = parsed.get('legalServiceName')
        if service_id is not None:
            matches = [s for s in services if s['id'] == service_id and s['name'] == service_name
                       and category_id is not None
                       and str(s.get('category', '')).casefold() == category_name.casefold()]
            if len(matches) != 1:
                raise InvalidClassification('Legal Service must belong to the verified Practice Area catalog')
        elif service_name is not None:
            raise InvalidClassification('Legal Service name must be paired with a real service ID')
        parsed = {**parsed, 'supported': category_id is not None}
        parsed_date = parsed.get('preferredDate')
        if parsed_date is not None:
            try:
                date.fromisoformat(parsed_date)
            except (TypeError, ValueError):
                raise InvalidClassification('Gemini returned an invalid date') from None
        effective_date = state.get('date') or parsed_date
        if effective_date:
            try:
                requested_date = date.fromisoformat(effective_date)
            except (TypeError, ValueError):
                raise InvalidClassification('Invalid requested date') from None
            if requested_date < date.today():
                raise InvalidClassification('Requested date must not be in the past')
        warnings = []
        if category_id is None:
            warnings.append('No supported Practice Area could be identified. No recommendation was generated.')
        if parsed.get('location'):
            warnings.append('Lawyer location is not recorded in this directory; location was not used for ranking.')
        return {'parsedRequirement': parsed, 'specialization_ids': [category_id] if category_id is not None else [],
                'date': effective_date, 'warnings': warnings,
                'trace': state['trace'] + [{'step': 'validate_category', 'categoryId': category_id,
                                           'legalServiceId': service_id,
                                           'status': 'completed' if category_id is not None else 'unsupported'}]}

    async def retrieve_lawyers(state: State):
        candidates = await data.candidates(state['specialization_ids'], state.get('date'))
        return {'candidates': candidates, 'trace': state['trace'] + [{'step': 'search_lawyers', 'candidateCount': len(candidates), 'status': 'completed'}]}

    def rank_candidates(state: State):
        ranked = []
        for lawyer in state['candidates']:
            if lawyer.get('status') != 'Active':
                continue
            areas = lawyer.get('specializations', [])
            if len(areas) != 1:
                continue  # Ambiguous legacy records fail closed; never treat multiple areas as eligibility.
            specs = [s['name'] for s in areas if s['id'] in state['specialization_ids']]
            if not specs:
                continue
            if state.get('date') and state['date'] not in lawyer.get('availableDates', []):
                continue  # Filter before limit/ranking so an invalid record cannot displace a valid candidate.
            experience = lawyer.get('experience')
            if type(experience) is not int or not 0 <= experience <= 70:
                continue
            reasons = []
            reasons.append('Practice Area match: ' + specs[0])
            reasons.append(f'{experience} years of recorded experience')
            if state.get('date'):
                reasons.append(f"Bookable slot verified for requested date {state['date']}; availability is rechecked at approval")
            else:
                reasons.append('Availability Not Filtered: no preferred date supplied; check an actual slot before booking')
            # Practice Area and requested-date availability are eligibility gates.
            # Identical bonuses add no ranking value; recorded experience determines points.
            score = experience
            ranked.append({'lawyerId': lawyer['lawyerId'], 'score': score, 'reason': '. '.join(reasons) + '.'})
        ranked.sort(key=lambda r: (-r['score'], r['lawyerId']))
        return {'recommendations': ranked[:state.get('limit', 5)],
                'trace': state['trace'] + [{'step': 'rank_candidates', 'eligibleCount': len(ranked), 'status': 'completed'}]}

    def validate_recommendations(state: State):
        candidates = {l['lawyerId']: l for l in state['candidates']}
        validated = []
        for item in state['recommendations']:
            lawyer = candidates.get(item['lawyerId'])
            if not lawyer or lawyer.get('status') != 'Active':
                continue
            if len(lawyer.get('specializations', [])) != 1 or not any(s['id'] in state['specialization_ids'] for s in lawyer.get('specializations', [])):
                continue
            if state.get('date') and state['date'] not in lawyer.get('availableDates', []):
                continue
            validated.append(item)
        warnings = list(state['warnings'])
        if not validated and not warnings:
            warnings.append('No eligible lawyers matched the requirement.')
        return {'recommendations': validated, 'warnings': warnings,
                'trace': state['trace'] + [{'step': 'validate_recommendations', 'validatedCount': len(validated), 'status': 'completed'}]}

    def await_human_approval(state: State):
        status = 'AWAITING_APPROVAL' if state['recommendations'] else 'NO_MATCH'
        return {'status': status,
                'trace': state['trace'] + [{'step': 'await_human_approval', 'status': status}]}

    def unsupported(state: State):
        return {'recommendations': [], 'status': 'UNSUPPORTED'}

    graph = StateGraph(State)
    for name, node in [('parse_requirement', parse_requirement), ('validate_category', validate_category),
                       ('retrieve_lawyers', retrieve_lawyers), ('rank_candidates', rank_candidates),
                       ('validate_recommendations', validate_recommendations),
                       ('await_human_approval', await_human_approval), ('unsupported', unsupported)]:
        graph.add_node(name, node)
    graph.add_edge(START, 'parse_requirement')
    graph.add_edge('parse_requirement', 'validate_category')
    graph.add_conditional_edges('validate_category',
                                lambda state: 'retrieve_lawyers' if state['specialization_ids'] else 'unsupported')
    graph.add_edge('retrieve_lawyers', 'rank_candidates')
    graph.add_edge('rank_candidates', 'validate_recommendations')
    graph.add_edge('validate_recommendations', 'await_human_approval')
    graph.add_edge('await_human_approval', END)
    graph.add_edge('unsupported', END)
    return graph.compile()
