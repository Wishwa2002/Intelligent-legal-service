"""AI-assisted missing provider failure regressions: no live SDK transport."""
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
import pytest
from lawyer_recommendation.gemini import GeminiClassifier, GeminiUnavailable

@pytest.mark.asyncio
@pytest.mark.parametrize('status',[503,504])
async def test_provider_unavailable_retries_are_bounded_and_secret_safe(status):
    class ProviderFailure(Exception):
        code=status
    call=AsyncMock(side_effect=ProviderFailure('synthetic-private-detail'))
    fake=SimpleNamespace(aio=SimpleNamespace(models=SimpleNamespace(generate_content=call)))
    with patch.dict('os.environ',{'GEMINI_API_KEY':'synthetic-only-key'}),patch('google.genai.Client',return_value=fake),patch('asyncio.sleep',new=AsyncMock()) as sleep:
        with pytest.raises(GeminiUnavailable) as error:
            await GeminiClassifier().classify('synthetic property dispute',[],[])
    assert call.await_count==3 and sleep.await_count==2
    assert error.value.status==status
    assert 'synthetic-private-detail' not in str(error.value)

@pytest.mark.asyncio
async def test_provider_timeout_has_bounded_recovery_and_safe_error():
    call=AsyncMock(side_effect=TimeoutError('synthetic-private-detail'))
    fake=SimpleNamespace(aio=SimpleNamespace(models=SimpleNamespace(generate_content=call)))
    with patch.dict('os.environ',{'GEMINI_API_KEY':'synthetic-only-key'}),patch('google.genai.Client',return_value=fake),patch('asyncio.sleep',new=AsyncMock()):
        with pytest.raises(GeminiUnavailable) as error:await GeminiClassifier().classify('synthetic property dispute',[],[])
    assert call.await_count==3 and error.value.stage=='timeout'
    assert 'synthetic-private-detail' not in str(error.value)

@pytest.mark.asyncio
@pytest.mark.parametrize('text',['{malformed', '{"requirement":"synthetic","unexpected":"unsafe"}', '{"requirement":"synthetic","categoryId":"not-an-int"}'])
async def test_invalid_provider_output_is_not_retried_as_an_outage(text):
    call=AsyncMock(return_value=SimpleNamespace(text=text));fake=SimpleNamespace(aio=SimpleNamespace(models=SimpleNamespace(generate_content=call)))
    with patch.dict('os.environ',{'GEMINI_API_KEY':'synthetic-only-key'}),patch('google.genai.Client',return_value=fake),patch('asyncio.sleep',new=AsyncMock()) as sleep:
        with pytest.raises(GeminiUnavailable) as error:await GeminiClassifier().classify('synthetic property dispute',[],[])
    assert call.await_count==1 and error.value.stage=='structured_output';sleep.assert_not_awaited()
