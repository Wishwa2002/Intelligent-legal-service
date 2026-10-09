import asyncio
import os
import secrets
import logging
from datetime import date as Date
from uuid import UUID
import httpx
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field, field_validator
from dotenv import load_dotenv
from .agent import InvalidClassification, build_recommendation_graph
from .gemini import GeminiUnavailable, ParsedRequirement
from workforce_hiring.drafting import WorkforceFacts, HiringDraft, InvalidHiringDraft, build_hiring_graph


load_dotenv()
logger = logging.getLogger(__name__)
app = FastAPI(title='Member 1 Lawyer Recommendation', docs_url=None, redoc_url=None)


class RecommendationRequest(BaseModel):
    specializations: list[dict] = Field(default_factory=list)
    services: list[dict] = Field(default_factory=list)
    candidates: list[dict] = Field(default_factory=list)
    requirement: str = Field(min_length=3, max_length=4000)
    @field_validator('requirement')
    @classmethod
    def requirement_not_blank(cls, value: str) -> str:
        if len(value.strip()) < 3:
            raise ValueError('Requirement must contain at least three non-padding characters')
        return value.strip()

    date: Date | None = None
    limit: int = Field(default=5, ge=1, le=20)


class Recommendation(BaseModel):
    lawyerId: UUID
    score: int
    reason: str


class RecommendationResponse(BaseModel):
    recommendations: list[Recommendation]
    warnings: list[str]
    trace: list[dict]
    parsedRequirement: ParsedRequirement
    date: Date | None = None


@app.get('/health')
async def health():
    return {'status': 'ok'}


@app.post('/lawyer-recommendations', response_model=RecommendationResponse)
async def recommend(request: RecommendationRequest, x_internal_key: str = Header(default=''), x_correlation_id: str = Header(default='')):
    # Accept only UUID correlation IDs so arbitrary header text cannot enter logs.
    try: correlation = str(UUID(x_correlation_id))
    except ValueError: correlation = 'unavailable'
    key = os.environ.get('AI_INTERNAL_KEY', '')
    if not key or not secrets.compare_digest(key, x_internal_key):
        logger.warning('Recommendation failure stage=internal_authentication status=401 correlationId=%s', correlation)
        raise HTTPException(401, 'Internal authentication required')
    # Only the authenticated backend supplies the database snapshot. No browser data
    # or model-generated lawyer identities are trusted as candidates.
    class SnapshotData:
        async def catalogs(self):
            return request.specializations, request.services

        async def candidates(self, specialization_ids, date=None):
            return [lawyer for lawyer in request.candidates
                    if any(s['id'] in specialization_ids for s in lawyer['specializations'])
                    and (not date or date in lawyer.get('availableDates', []))]

    try:
        graph = build_recommendation_graph(SnapshotData())
        result = await asyncio.wait_for(graph.ainvoke({
            'requirement': request.requirement,
            'date': request.date.isoformat() if request.date else None,
            'limit': request.limit,
        }), timeout=40)
        return {k: result[k] for k in ('recommendations', 'warnings', 'trace', 'parsedRequirement', 'date')}
    except InvalidClassification:
        logger.warning('Recommendation failure stage=catalog_validation status=422 correlationId=%s', correlation)
        raise HTTPException(422, 'The legal category could not be validated. Please refine the requirement.') from None
    except GeminiUnavailable as error:
        logger.warning('Recommendation failure stage=%s providerStatus=%s status=503 correlationId=%s', error.stage, error.status, correlation)
        raise HTTPException(503, 'Requirement understanding is temporarily unavailable') from None
    except ValueError:
        logger.warning('Recommendation failure stage=ranking_validation status=422 correlationId=%s', correlation)
        raise HTTPException(422, 'Unable to rank candidates. Refine the requirement.') from None
    except (httpx.HTTPError, TimeoutError) as error:
        logger.warning('Recommendation failure stage=transport_or_timeout exceptionType=%s status=503 correlationId=%s', type(error).__name__, correlation)
        raise HTTPException(503, 'Platform discovery is temporarily unavailable') from None


# Reuses the Member 1 internal-only service and authentication boundary.


@app.post('/hiring-suggestions', response_model=HiringDraft)
async def hiring_suggestion(request: WorkforceFacts, x_internal_key: str = Header(default='')):
    key = os.environ.get('AI_INTERNAL_KEY', '')
    if not key or not secrets.compare_digest(key, x_internal_key):
        logger.warning('Hiring failure stage=internal_authentication status=401')
        raise HTTPException(401, 'Internal authentication required')
    try:
        facts = WorkforceFacts.model_validate(request.model_dump(), strict=True, extra='forbid')
        result = await asyncio.wait_for(build_hiring_graph().ainvoke({'facts': facts}), timeout=35)
        return result['draft']
    except (InvalidHiringDraft, ValueError):
        logger.warning('Hiring failure stage=draft_validation status=422')
        raise HTTPException(422, 'AI hiring content could not be validated. Please retry.') from None
    except GeminiUnavailable as error:
        logger.warning('Hiring failure stage=%s providerStatus=%s status=503', error.stage, error.status)
        raise HTTPException(503, 'AI hiring assistance is temporarily unavailable') from None
    except TimeoutError:
        logger.warning('Hiring failure stage=workflow_timeout status=503')
        raise HTTPException(503, 'AI hiring assistance is temporarily unavailable') from None
