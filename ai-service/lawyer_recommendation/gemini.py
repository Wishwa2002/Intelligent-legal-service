"""One structured Gemini call, limited to legal requirement understanding."""
import asyncio
import os
import logging
import re
import httpx
from datetime import date

from pydantic import BaseModel, Field
from model_config import DEFAULT_GEMINI_MODEL


class ParsedRequirement(BaseModel):
    requirement: str = Field(min_length=3, max_length=4000)
    categoryId: int | None = None
    categoryName: str | None = None
    location: str | None = None
    preferredDate: str | None = None
    keywords: list[str] = Field(default_factory=list, max_length=8)
    legalServiceId: int | None = None
    legalServiceName: str | None = Field(default=None, max_length=200)
    matterSummary: str | None = Field(default=None, max_length=300)
    supported: bool | None = None


logger = logging.getLogger(__name__)
MAX_PROVIDER_RETRY_WAIT_SECONDS = 1.0


def provider_retry_seconds(error):
    # Read only numeric retry timing, never log provider bodies/messages.
    details = getattr(error, 'details', None)
    if not isinstance(details, dict): return None
    payload = details.get('error', details)
    if not isinstance(payload, dict): return None
    for detail in payload.get('details', []) or []:
        if not isinstance(detail, dict) or not str(detail.get('@type', '')).endswith('RetryInfo'): continue
        match = re.fullmatch(r'(\d+(?:\.\d+)?)s', str(detail.get('retryDelay', '')))
        if match: return float(match.group(1))
    return None


class GeminiUnavailable(RuntimeError):
    def __init__(self, message, *, stage='classification', status=None):
        super().__init__(message)
        self.stage = stage
        self.status = status


class GeminiClassifier:
    async def classify(self, requirement: str, categories: list[dict], services: list[dict]) -> dict:
        key = os.getenv('GEMINI_API_KEY', '').strip()
        if not key:
            raise GeminiUnavailable('Gemini API key is not configured', stage='configuration')
        try:
            from google import genai
            from google.genai import types
        except ImportError:
            raise GeminiUnavailable('Google GenAI SDK is not installed', stage='sdk_import') from None

        prompt = (
            'You classify a legal issue for lawyer matching, not legal advice. Return structured data only. '
            'Choose categoryId and categoryName together from the supplied categories only when the legal issue clearly belongs to one. '
            'If the issue belongs to a legal field absent from the catalog, is nonsense, or is uncertain, return both null; do not choose the closest unrelated category. '
            'Never invent category IDs, lawyer IDs, lawyers, availability, or make a booking decision. '
            'Optionally identify legalServiceId and legalServiceName together from the supplied legal services, '
            'only if the service clearly matches the issue and its category matches the chosen categoryName. '
            'If uncertain, return both service fields null. Never invent a service or choose an unrelated one. '
            'Set supported to whether a catalog category was identified. Include a concise matterSummary '
            'describing only the stated issue, with no reasoning, legal advice or inferred facts. '
            'Extract a preferredDate only if explicit and unambiguous; use ISO YYYY-MM-DD. '
            'Do not infer facts absent from the user text.\n'
            f'Today: {date.today().isoformat()}\nCategories: {categories}\nLegal services: {services}\n'
            f'User requirement: {requirement}'
        )
        # Use the already-installed HTTPX client explicitly. The optional aiohttp
        # transport can reuse a closed connector; close this transport after the call.
        async with httpx.AsyncClient() as transport:
            try:
                client = genai.Client(api_key=key, http_options=types.HttpOptions(httpx_async_client=transport))
            except Exception as exc:
                logger.warning('Gemini failure stage=client_initialization exceptionType=%s', type(exc).__name__)
                raise GeminiUnavailable('Gemini could not be initialized', stage='client_initialization') from None
            for attempt in range(3):
                try:
                    response = await asyncio.wait_for(client.aio.models.generate_content(
                        model=os.getenv('GEMINI_MODEL') or DEFAULT_GEMINI_MODEL,
                        contents=prompt,
                        config=types.GenerateContentConfig(response_mime_type='application/json',
                                                           response_schema=ParsedRequirement, temperature=0),
                    ), timeout=20)
                    return ParsedRequirement.model_validate_json(response.text, extra='forbid').model_dump()
                except Exception as exc:
                    status = getattr(exc, 'code', None) or getattr(exc, 'status_code', None)
                    # Whitelist metadata rather than formatting provider exceptions, which can contain secrets.
                    status = status if isinstance(status, int) and 100 <= status <= 599 else None
                    stage = ('provider_rate_limit' if status == 429 else 'provider_model' if status == 404
                             else 'provider_authentication' if status in (401, 403) else 'provider' if status
                             else 'timeout' if isinstance(exc, TimeoutError)
                             else 'transport' if isinstance(exc, (httpx.HTTPError, ConnectionError))
                             else 'structured_output' if isinstance(exc, ValueError) else 'sdk')
                    retry_seconds = provider_retry_seconds(exc)
                    logger.warning('Gemini failure stage=%s status=%s exceptionType=%s attempt=%s retrySeconds=%s',
                                   stage, status, type(exc).__name__, attempt + 1, retry_seconds)
                    temporary = isinstance(exc, (TimeoutError, ConnectionError, httpx.TransportError)) or status in (429, 500, 502, 503, 504)
                    if temporary and attempt < 2 and (retry_seconds is None or retry_seconds <= MAX_PROVIDER_RETRY_WAIT_SECONDS):
                        await asyncio.sleep(max(0.25 * (2 ** attempt), retry_seconds or 0))
                        continue
                    message = 'Gemini is temporarily unavailable' if temporary else 'Gemini returned an invalid structured requirement'
                    raise GeminiUnavailable(message, stage=stage, status=status) from None
        raise GeminiUnavailable('Gemini is unavailable')
