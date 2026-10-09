import unittest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from lawyer_recommendation.app import app

class SnapshotTests(unittest.TestCase):
    def test_health_exposes_only_liveness(self):
        with TestClient(app) as client:
            response = client.get('/health')
        self.assertEqual(200, response.status_code)
        self.assertEqual({'status': 'ok'}, response.json())

    def test_missing_gemini_key_is_safe_error(self):
        with patch.dict('os.environ', {'AI_INTERNAL_KEY': 'test-only-key', 'GEMINI_API_KEY': ''}), TestClient(app) as client:
            response = client.post('/lawyer-recommendations', json={
                'requirement': 'property dispute', 'specializations': [{'id': 1, 'name': 'Property'}],
                'candidates': []}, headers={'X-Internal-Key': 'test-only-key'})
        self.assertEqual(503, response.status_code)

    def test_requires_internal_authentication(self):
        with patch.dict('os.environ', {'AI_INTERNAL_KEY': 'test-only-key'}), TestClient(app) as client:
            self.assertEqual(401, client.post('/lawyer-recommendations', json={'requirement': 'property'}).status_code)
            self.assertEqual(401, client.post('/lawyer-recommendations', json={'requirement': 'property'}, headers={'X-Internal-Key':'wrong-key'}).status_code)

    def test_ranks_only_matching_active_snapshot_candidates(self):
        payload = {
            'requirement': 'property dispute',
            'specializations': [{'id': 1, 'name': 'Property', 'description': 'Property disputes'}],
            'services': [],
            'candidates': [
                {'lawyerId': '00000000-0000-0000-0000-000000000001', 'status': 'Active', 'experience': 5, 'specializations': [{'id': 1, 'name': 'Property'}], 'legalServices': [], 'availableDates': []},
                {'lawyerId': '00000000-0000-0000-0000-000000000002', 'status': 'Inactive', 'experience': 20, 'specializations': [{'id': 1, 'name': 'Property'}], 'legalServices': [], 'availableDates': []},
            ],
        }
        parsed = {'requirement': 'property dispute', 'categoryId': 1, 'categoryName': 'Property',
                  'location': None, 'preferredDate': None, 'keywords': ['property']}
        with patch.dict('os.environ', {'AI_INTERNAL_KEY': 'test-only-key'}), \
             patch('lawyer_recommendation.gemini.GeminiClassifier.classify', new=AsyncMock(return_value=parsed)), \
             TestClient(app) as client:
            response = client.post('/lawyer-recommendations', json=payload, headers={'X-Internal-Key': 'test-only-key'})
        self.assertEqual(200, response.status_code)
        result = response.json()['recommendations']
        self.assertEqual(1, len(result))
        self.assertEqual(payload['candidates'][0]['lawyerId'], result[0]['lawyerId'])
        self.assertEqual(5, result[0]['score'])
