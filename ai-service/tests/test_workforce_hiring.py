import json
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from lawyer_recommendation.app import app
from workforce_hiring.drafting import WorkforceFacts, HiringDraft, validate_draft, InvalidHiringDraft, build_hiring_graph, GeminiHiringDrafter

FACTS = dict(practiceArea='Recorded Practice Area', activeLawyerCount=1, legalServiceCount=2,
             recentDemandCount=8, recentAppointmentCount=3, futureAvailableSlotCount=2,
             status='CAPACITY_CONCERN', reasons=['HIGH_DEMAND_LOW_AVAILABILITY'], recentWindowDays=30, futureWindowDays=30)
DRAFT = dict(suggestedTitle='Practice Area Associate', operationalReason='Recorded demand exceeds available capacity.',
             summary='Support the recorded legal practice.', responsibilities=['Assist with matters in the recorded Practice Area.'], focusAreas=['Recorded Practice Area'])

class WorkforceHiringTests(unittest.IsolatedAsyncioTestCase):
    async def test_provider_quota_metadata_is_safe_and_not_retried(self):
        from lawyer_recommendation.gemini import GeminiUnavailable
        class QuotaError(Exception):
            code = 429
            details = {'error': {'details': [{'@type': 'type.googleapis.com/google.rpc.RetryInfo', 'retryDelay': '3600s'}]}}
        model = SimpleNamespace(generate_content=AsyncMock(side_effect=QuotaError('private provider request')))
        fake = SimpleNamespace(aio=SimpleNamespace(models=model))
        with patch.dict('os.environ', {'GEMINI_API_KEY': 'test-only'}), patch('google.genai.Client', return_value=fake):
            with self.assertLogs('workforce_hiring.drafting', level='WARNING') as logs:
                with self.assertRaises(GeminiUnavailable) as result:
                    await GeminiHiringDrafter().draft(WorkforceFacts(**FACTS))
            self.assertEqual(429, result.exception.status)
            self.assertEqual('provider_rate_limit', result.exception.stage)
            output = ' '.join(logs.output)
            self.assertIn('providerStatus=429', output)
            self.assertIn('retrySeconds=3600', output)
            self.assertNotIn('private provider request', output)
            self.assertNotIn('test-only', output)
            model.generate_content.assert_awaited_once()

    async def test_admin_rules_remain_verified_facts_in_gemini_prompt(self):
        values = dict(minimumActiveLawyers=4, targetActiveLawyers=6, minimumFutureSlots=12,
                      highDemandThreshold=10, watchCapacityRatio=0.75, settingsSource='CUSTOM')
        model = SimpleNamespace(generate_content=AsyncMock(return_value=SimpleNamespace(text=json.dumps(DRAFT))))
        fake = SimpleNamespace(aio=SimpleNamespace(models=model))
        with patch.dict('os.environ', {'GEMINI_API_KEY': 'test-only'}), patch('google.genai.Client', return_value=fake):
            await GeminiHiringDrafter().draft(WorkforceFacts(**FACTS, **values))
        prompt = model.generate_content.call_args.kwargs['contents']
        supplied = json.loads(prompt.split('Verified facts: ')[1])
        for key, value in values.items():
            self.assertEqual(value, supplied[key])
        self.assertIn('never modify them', prompt)
        self.assertIn('target shortfall alone', prompt)
        with self.assertRaises(ValueError):
            WorkforceFacts(**FACTS, **{**values, 'targetActiveLawyers': 3})
        self.assertEqual('DEFAULT', WorkforceFacts(**FACTS).settingsSource)

    def test_verified_payload_and_missing_invalid_data(self):
        self.assertEqual(8, WorkforceFacts.model_validate(FACTS, strict=True, extra='forbid').recentDemandCount)
        for invalid in [{}, {**FACTS, 'activeLawyerCount': -1}, {**FACTS, 'status': 'AI_SAYS_HIRE'}, {**FACTS, 'practiceArea': '   '}, {**FACTS, 'lawyerId': 'invented'}]:
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                WorkforceFacts.model_validate(invalid, strict=True, extra='forbid')

    def test_valid_draft_requires_no_unprovided_employment_fields(self):
        result = validate_draft(DRAFT, WorkforceFacts(**FACTS)).model_dump()
        self.assertEqual(set(DRAFT), set(result))
        for field in ['salary', 'employmentType', 'location', 'minimumExperience', 'degree', 'benefits', 'vacancies', 'chainOfThought']:
            with self.subTest(field=field), self.assertRaises(InvalidHiringDraft):
                validate_draft({**DRAFT, field: 'invented'}, WorkforceFacts(**FACTS))

    def test_malformed_or_invented_prose_and_focus_rejected(self):
        for change in [{'responsibilities': []}, {'summary': ' '}, {'suggestedTitle': 22},
                       {'summary': 'Salary is generous with benefits.'}, {'summary': 'Minimum experience is ten years of experience.'},
                       {'focusAreas': ['Invented Area']}]:
            with self.subTest(change=change), self.assertRaises(InvalidHiringDraft):
                validate_draft({**DRAFT, **change}, WorkforceFacts(**FACTS))

    async def test_graph_returns_only_draft_and_never_performs_business_action(self):
        drafter = SimpleNamespace(draft=AsyncMock(return_value=DRAFT))
        result = await build_hiring_graph(drafter).ainvoke({'facts': WorkforceFacts(**FACTS)})
        self.assertEqual(DRAFT, result['draft'])
        drafter.draft.assert_awaited_once()
        self.assertNotIn('careerOpeningId', result['draft'])
        self.assertNotIn('chainOfThought', result['draft'])

    async def test_gemini_structured_schema_and_safe_invalid_json(self):
        model = SimpleNamespace(generate_content=AsyncMock(return_value=SimpleNamespace(text=json.dumps(DRAFT))))
        fake = SimpleNamespace(aio=SimpleNamespace(models=model))
        with patch.dict('os.environ', {'GEMINI_API_KEY': 'test-only'}), patch('google.genai.Client', return_value=fake):
            self.assertEqual(DRAFT, await GeminiHiringDrafter().draft(WorkforceFacts(**FACTS)))
            config = model.generate_content.call_args.kwargs['config']
            self.assertEqual('application/json', config.response_mime_type)
            self.assertNotIn('additionalProperties', HiringDraft.model_json_schema())
            model.generate_content.return_value = SimpleNamespace(text='not JSON')
            with self.assertRaises(InvalidHiringDraft): await GeminiHiringDrafter().draft(WorkforceFacts(**FACTS))

    def test_internal_auth_controlled_errors_and_filtered_output(self):
        client = TestClient(app)
        with patch.dict('os.environ', {'AI_INTERNAL_KEY': 'test-only'}):
            self.assertEqual(401, client.post('/hiring-suggestions', json=FACTS).status_code)
            headers = {'X-Internal-Key': 'test-only'}
            self.assertEqual(422, client.post('/hiring-suggestions', json={**FACTS, 'status': 'unknown'}, headers=headers).status_code)
            graph = SimpleNamespace(ainvoke=AsyncMock(return_value={'draft': DRAFT}))
            with patch('lawyer_recommendation.app.build_hiring_graph', return_value=graph):
                response = client.post('/hiring-suggestions', json=FACTS, headers=headers)
                self.assertEqual(200, response.status_code)
                self.assertEqual(DRAFT, response.json())
            graph = SimpleNamespace(ainvoke=AsyncMock(side_effect=InvalidHiringDraft('private model output')))
            with patch('lawyer_recommendation.app.build_hiring_graph', return_value=graph):
                response = client.post('/hiring-suggestions', json=FACTS, headers=headers)
                self.assertEqual(422, response.status_code)
                self.assertNotIn('private model output', response.text)

            from lawyer_recommendation.gemini import GeminiUnavailable
            graph = SimpleNamespace(ainvoke=AsyncMock(side_effect=GeminiUnavailable('private provider failure')))
            with patch('lawyer_recommendation.app.build_hiring_graph', return_value=graph):
                response = client.post('/hiring-suggestions', json=FACTS, headers=headers)
                self.assertEqual(503, response.status_code)
                self.assertNotIn('private provider failure', response.text)
