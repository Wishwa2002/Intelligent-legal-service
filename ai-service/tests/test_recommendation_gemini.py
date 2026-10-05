import json
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from lawyer_recommendation.gemini import GeminiClassifier, GeminiUnavailable, ParsedRequirement
from model_config import DEFAULT_GEMINI_MODEL


class GeminiClassificationTests(unittest.IsolatedAsyncioTestCase):
    def test_schema_accepted_by_gemini_and_unexpected_fields_rejected_locally(self):
        self.assertNotIn('additionalProperties', ParsedRequirement.model_json_schema())
        with self.assertRaises(ValueError):
            ParsedRequirement.model_validate({
                'requirement': 'Synthetic property dispute', 'lawyerId': 999,
            }, extra='forbid')

    async def test_uses_configured_model_and_structured_output(self):
        payload = {'requirement': 'Synthetic property dispute', 'categoryId': 3,
                   'categoryName': 'Property Law', 'location': None, 'preferredDate': None, 'keywords': ['property']}
        fake = SimpleNamespace(aio=SimpleNamespace(models=SimpleNamespace(
            generate_content=AsyncMock(return_value=SimpleNamespace(text=json.dumps(payload))))))
        with patch.dict('os.environ', {'GEMINI_API_KEY': 'test-only-key', 'GEMINI_MODEL': DEFAULT_GEMINI_MODEL}), \
             patch('google.genai.Client', return_value=fake):
            parsed = await GeminiClassifier().classify('Synthetic property dispute',
                [{'id': 3, 'name': 'Property Law'}], [])
        self.assertEqual(3, parsed['categoryId'])
        self.assertEqual(DEFAULT_GEMINI_MODEL, fake.aio.models.generate_content.call_args.kwargs['model'])
        self.assertEqual('application/json', fake.aio.models.generate_content.call_args.kwargs['config'].response_mime_type)

    async def test_invalid_json_fails_without_fabricating_category(self):
        fake = SimpleNamespace(aio=SimpleNamespace(models=SimpleNamespace(
            generate_content=AsyncMock(return_value=SimpleNamespace(text='not JSON')))))
        with patch.dict('os.environ', {'GEMINI_API_KEY': 'test-only-key'}), \
             patch('google.genai.Client', return_value=fake):
            with self.assertRaises(GeminiUnavailable):
                await GeminiClassifier().classify('Synthetic property dispute', [{'id': 3, 'name': 'Property Law'}], [])

    async def test_provider_429_is_logged_safely_and_retried_without_a_fallback(self):
        class ProviderError(Exception):
            code = 429
        fake = SimpleNamespace(aio=SimpleNamespace(models=SimpleNamespace(
            generate_content=AsyncMock(side_effect=ProviderError('private provider output test-secret')))))
        with patch.dict('os.environ', {'GEMINI_API_KEY': 'private-test-key'}), \
             patch('google.genai.Client', return_value=fake) as client, \
             patch('asyncio.sleep', new=AsyncMock()), \
             self.assertLogs('lawyer_recommendation.gemini', level='WARNING') as logs:
            with self.assertRaises(GeminiUnavailable) as result:
                await GeminiClassifier().classify('property dispute', [{'id':3,'name':'Property'}], [])
        self.assertEqual(429, result.exception.status)
        self.assertEqual('provider_rate_limit', result.exception.stage)
        self.assertEqual(3, fake.aio.models.generate_content.await_count)
        self.assertIsNotNone(client.call_args.kwargs['http_options'].httpx_async_client)
        self.assertNotIn('private-test-key', ''.join(logs.output))
        self.assertNotIn('test-secret', ''.join(logs.output))
        self.assertIn('status=429', ''.join(logs.output))

    async def test_structured_parse_failure_has_a_distinct_safe_stage(self):
        fake = SimpleNamespace(aio=SimpleNamespace(models=SimpleNamespace(
            generate_content=AsyncMock(return_value=SimpleNamespace(text='not JSON private-test-content')))))
        with patch.dict('os.environ', {'GEMINI_API_KEY': 'test-only-key'}), \
             patch('google.genai.Client', return_value=fake), \
             self.assertLogs('lawyer_recommendation.gemini', level='WARNING') as logs:
            with self.assertRaises(GeminiUnavailable) as result:
                await GeminiClassifier().classify('property dispute', [], [])
        self.assertEqual('structured_output', result.exception.stage)
        self.assertEqual(1, fake.aio.models.generate_content.await_count)
        self.assertNotIn('private-test-content', ''.join(logs.output))

    async def test_exhausted_daily_quota_does_not_rapidly_retry_or_sleep_for_hours(self):
        class DailyQuotaError(Exception):
            code = 429
            details = {'error': {'details': [{'@type':'type.googleapis.com/google.rpc.RetryInfo','retryDelay':'84000s'}]}}
        fake = SimpleNamespace(aio=SimpleNamespace(models=SimpleNamespace(
            generate_content=AsyncMock(side_effect=DailyQuotaError('private response')))))
        with patch.dict('os.environ', {'GEMINI_API_KEY':'test-only-key'}), \
             patch('google.genai.Client', return_value=fake), patch('asyncio.sleep', new=AsyncMock()) as sleep:
            with self.assertRaises(GeminiUnavailable) as result:
                await GeminiClassifier().classify('property dispute', [], [])
        self.assertEqual(429, result.exception.status)
        self.assertEqual(1, fake.aio.models.generate_content.await_count)
        sleep.assert_not_awaited()


if __name__ == '__main__':
    unittest.main()
