import unittest
from lawyer_recommendation.agent import InvalidClassification, build_recommendation_graph


class Data:
    async def catalogs(self):
        return [{'id': 2, 'name': 'Real Estate & Property Law', 'description': 'Land ownership disputes'}], [{'id': 2, 'name': 'Title review', 'description': '', 'category': 'Real Estate & Property Law'}]

    async def candidates(self, specialization_ids, date=None):
        return [dict(lawyerId=str(i), status=status, experience=experience, availableDates=['2030-01-01'] if i == 3 else [],
                     specializations=[{'id': 2, 'name': 'Real Estate & Property Law'}], legalServices=[])
                for i, status, experience in [(1, 'Active', 10), (2, 'Inactive', 30), (3, 'Active', 2)]
                if not date or (date == '2030-01-01' and i == 3)]


class AgentTests(unittest.IsolatedAsyncioTestCase):
    class Classifier:
        async def classify(self, requirement, categories, services):
            return {'requirement': requirement, 'categoryId': 2 if requirement != 'unrecognized topic' else None,
                    'categoryName': 'Real Estate & Property Law' if requirement != 'unrecognized topic' else None,
                    'preferredDate': None, 'location': None, 'keywords': []}

    async def test_grounded_ranking_excludes_inactive(self):
        result = await build_recommendation_graph(Data(), self.Classifier()).ainvoke({'requirement': 'property dispute', 'limit': 5})
        self.assertEqual(['1', '3'], [r['lawyerId'] for r in result['recommendations']])
        self.assertIn('Real Estate & Property Law', result['recommendations'][0]['reason'])
        self.assertEqual('await_human_approval', result['trace'][-1]['step'])
        self.assertEqual('AWAITING_APPROVAL', result['status'])

    async def test_date_requires_recorded_availability(self):
        result = await build_recommendation_graph(Data(), self.Classifier()).ainvoke({'requirement': 'land ownership', 'date': '2030-01-01'})
        self.assertEqual(['3'], [r['lawyerId'] for r in result['recommendations']])
        self.assertIn('rechecked at approval', result['recommendations'][0]['reason'])

    async def test_unmatched_requirement_requests_clarification(self):
        result = await build_recommendation_graph(Data(), self.Classifier()).ainvoke({'requirement': 'unrecognized topic'})
        self.assertEqual([], result['recommendations'])
        self.assertTrue(result['warnings'])
        self.assertEqual('UNSUPPORTED', result['status'])
        self.assertEqual(['parse_requirement', 'validate_category'], [step['step'] for step in result['trace']])

    async def test_legacy_service_link_does_not_change_score_or_order(self):
        class ServiceLinkedData(Data):
            async def candidates(self, specialization_ids, date=None):
                lawyers = await super().candidates(specialization_ids, date)
                lawyers[0]['legalServices'] = [{'id': 2, 'name': 'Title review'}]
                return lawyers
        result = await build_recommendation_graph(ServiceLinkedData(), self.Classifier()).ainvoke({'requirement': 'property dispute'})
        self.assertEqual([10, 2], [item['score'] for item in result['recommendations']])
        self.assertNotIn('Service match', result['recommendations'][0]['reason'])

    async def test_no_available_candidates(self):
        result = await build_recommendation_graph(Data(), self.Classifier()).ainvoke({'requirement': 'property dispute', 'date': '2030-02-02'})
        self.assertEqual([], result['recommendations'])
        self.assertTrue(result['warnings'])

    async def test_hallucinated_category_is_rejected(self):
        class InvalidClassifier:
            async def classify(self, requirement, categories, services):
                return {'requirement': requirement, 'categoryId': 999, 'categoryName': 'Invented Law', 'preferredDate': None}
        with self.assertRaises(InvalidClassification):
            await build_recommendation_graph(Data(), InvalidClassifier()).ainvoke({'requirement': 'property dispute'})

    async def test_model_date_requires_real_unbooked_availability(self):
        class DateClassifier(self.Classifier):
            async def classify(self, requirement, categories, services):
                parsed = await super().classify(requirement, categories, services)
                parsed['preferredDate'] = '2030-02-02'
                return parsed
        result = await build_recommendation_graph(Data(), DateClassifier()).ainvoke({'requirement': 'property dispute'})
        self.assertEqual([], result['recommendations'])


if __name__ == '__main__':
    unittest.main()
