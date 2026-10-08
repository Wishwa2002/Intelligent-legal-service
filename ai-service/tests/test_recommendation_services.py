"""Catalog service validation uses synthetic snapshots and stubbed interpretation."""
import unittest
from lawyer_recommendation.agent import build_recommendation_graph, InvalidClassification
from tests.test_recommendation import Data
import tests.test_recommendation as recommendation_tests


class ServiceInterpretationTests(unittest.IsolatedAsyncioTestCase):
    async def run_graph(self, **fields):
        class Classifier(recommendation_tests.AgentTests.Classifier):
            async def classify(self, requirement, categories, services):
                return {**await super().classify(requirement, categories, services), **fields}
        return await build_recommendation_graph(Data(), Classifier()).ainvoke({'requirement': 'property title review'})

    async def test_service_is_verified_without_changing_ranking(self):
        result = await self.run_graph(legalServiceId=2, legalServiceName='Title review', matterSummary='Review of a property title')
        self.assertEqual(2, result['parsedRequirement']['legalServiceId'])
        self.assertTrue(result['parsedRequirement']['supported'])
        self.assertEqual([10, 2], [r['score'] for r in result['recommendations']])

    async def test_uncertain_service_is_null_and_area_matching_continues(self):
        result = await self.run_graph(legalServiceId=None, legalServiceName=None)
        self.assertIsNone(result['parsedRequirement']['legalServiceId'])
        self.assertEqual('AWAITING_APPROVAL', result['status'])

    async def test_unknown_unpaired_or_wrong_area_service_is_rejected(self):
        for fields in [dict(legalServiceId=999, legalServiceName='Title review'),
                       dict(legalServiceId=2, legalServiceName='Invented service'),
                       dict(legalServiceName='Title review'), dict(legalServiceId=True, legalServiceName='Title review'),
                       dict(categoryId=None, categoryName=None, legalServiceId=2, legalServiceName='Title review')]:
            with self.subTest(fields=fields), self.assertRaises(InvalidClassification):
                await self.run_graph(**fields)
        class WrongAreaData(Data):
            async def catalogs(self):
                categories, services = await super().catalogs()
                services[0]['category'] = 'Tax Law'
                return categories, services
        class Classifier(recommendation_tests.AgentTests.Classifier):
            async def classify(self, requirement, categories, services):
                return {**await super().classify(requirement, categories, services), 'legalServiceId': 2, 'legalServiceName': 'Title review'}
        with self.assertRaises(InvalidClassification):
            await build_recommendation_graph(WrongAreaData(), Classifier()).ainvoke({'requirement': 'property title review'})

    async def test_supported_flag_is_system_derived_and_reasoning_is_rejected(self):
        self.assertTrue((await self.run_graph(supported=False))['parsedRequirement']['supported'])
        for field in ['reasoning', 'chainOfThought', 'thoughts']:
            with self.subTest(field=field), self.assertRaises(InvalidClassification):
                await self.run_graph(**{field: 'private reasoning'})
