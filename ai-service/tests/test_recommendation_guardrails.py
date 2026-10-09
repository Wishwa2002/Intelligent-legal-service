"""Deterministic guardrail tests; classification is explicitly stubbed, not a live model evaluation."""
import unittest
from lawyer_recommendation.agent import InvalidClassification, build_recommendation_graph

AREAS = ['Corporate & Commercial Law', 'Criminal Law', 'Labour & Employment Law', 'Real Estate & Property Law', 'Tax Law']
CASES = [
    ('I need a lawyer to review a commercial contract.', AREAS[0]),
    ('I have been charged with an offence and need legal representation.', AREAS[1]),
    ('My employer terminated me without proper notice.', AREAS[2]),
    ('I have a dispute about ownership of my land.', AREAS[3]),
    ('I received a tax assessment that I believe is incorrect.', AREAS[4]),
    ('I need help with divorce and child custody.', None),
    ('banana rocket purple chair', None),
]

class CatalogData:
    def __init__(self, candidates=None):
        self.rows = candidates if candidates is not None else [
            {'lawyerId': f'00000000-0000-0000-0000-{i:012d}', 'status': 'Active', 'experience': i,
             'specializations': [{'id': i, 'name': name}], 'availableDates': ['2030-01-01']}
            for i, name in enumerate(AREAS, 1)]
        self.retrievals = 0

    async def catalogs(self):
        return [{'id': i, 'name': name} for i, name in enumerate(AREAS, 1)], []

    async def candidates(self, specialization_ids, date=None):
        self.retrievals += 1
        # Deliberately return an unfiltered snapshot to test the graph's own checks.
        return self.rows

class Interpretation:
    def __init__(self, name, **extra):
        self.name, self.extra = name, extra

    async def classify(self, requirement, categories, services):
        return {'requirement': requirement, 'categoryId': AREAS.index(self.name) + 1 if self.name else None,
                'categoryName': self.name, **self.extra}

class Guardrails(unittest.IsolatedAsyncioTestCase):
    async def test_all_five_supported_requirements_and_no_date_claim(self):
        for requirement, area in CASES[:5]:
            with self.subTest(area=area):
                result = await build_recommendation_graph(CatalogData(), Interpretation(area)).ainvoke({'requirement': requirement})
                self.assertEqual(area, result['parsedRequirement']['categoryName'])
                self.assertEqual(1, len(result['recommendations']))
                self.assertEqual('AWAITING_APPROVAL', result['status'])
                self.assertIn('Availability Not Filtered', result['recommendations'][0]['reason'])
                self.assertNotIn('Unbooked slot recorded on', result['recommendations'][0]['reason'])
                self.assertIsNone(result['date'])

    async def test_family_and_nonsense_stop_without_retrieving_unrelated_lawyers(self):
        for requirement, area in CASES[5:]:
            with self.subTest(requirement=requirement):
                data = CatalogData()
                result = await build_recommendation_graph(data, Interpretation(area)).ainvoke({'requirement': requirement})
                self.assertEqual('UNSUPPORTED', result['status'])
                self.assertEqual([], result['recommendations'])
                self.assertEqual(0, data.retrievals)

    async def test_ai_cannot_inject_business_ids_or_explanations(self):
        for extra in [{'lawyerId': 'attacker'}, {'customerId': 'attacker'}, {'slotId': 'attacker'},
                      {'recommendations': [{'lawyerId': 'attacker'}]}, {'reason': 'Guaranteed success'}]:
            with self.subTest(extra=extra), self.assertRaises(InvalidClassification):
                await build_recommendation_graph(CatalogData(), Interpretation(AREAS[0], **extra)).ainvoke({'requirement': CASES[0][0]})

    async def test_invalid_category_id_name_and_type_are_rejected(self):
        for extra in [{'categoryId': 999}, {'categoryName': 'Family Law'}, {'categoryId': True}, {'categoryId': '1'},
                      {'categoryId': None}, {'preferredDate': 'invalid'}, {'preferredDate': '2020-01-01'}]:
            with self.subTest(extra=extra), self.assertRaises(InvalidClassification):
                await build_recommendation_graph(CatalogData(), Interpretation(AREAS[0], **extra)).ainvoke({'requirement': CASES[0][0]})

    async def test_inactive_wrong_area_ambiguous_and_bad_experience_are_excluded(self):
        data = CatalogData()
        good = data.rows[0]
        data.rows = [good, {**good, 'lawyerId': 'inactive', 'status': 'Inactive'},
                     {**good, 'lawyerId': 'ambiguous', 'specializations': good['specializations'] + data.rows[1]['specializations']},
                     {**good, 'lawyerId': 'invalid', 'experience': 1000}, data.rows[1]]
        result = await build_recommendation_graph(data, Interpretation(AREAS[0])).ainvoke({'requirement': CASES[0][0]})
        self.assertEqual([good['lawyerId']], [r['lawyerId'] for r in result['recommendations']])

    async def test_requested_date_is_filtered_before_limit(self):
        data = CatalogData()
        good = data.rows[0]
        data.rows = [{**good, 'lawyerId': 'unavailable', 'experience': 70, 'availableDates': []}, good]
        result = await build_recommendation_graph(data, Interpretation(AREAS[0])).ainvoke({'requirement': CASES[0][0], 'date': '2030-01-01', 'limit': 1})
        self.assertEqual([good['lawyerId']], [r['lawyerId'] for r in result['recommendations']])
        self.assertIn('2030-01-01', result['recommendations'][0]['reason'])

    async def test_no_eligible_and_zero_available_candidates(self):
        for rows, requested in [([], None), (CatalogData().rows, '2030-02-02')]:
            with self.subTest(date=requested):
                result = await build_recommendation_graph(CatalogData(rows), Interpretation(AREAS[0])).ainvoke({'requirement': CASES[0][0], 'date': requested})
                self.assertEqual([], result['recommendations'])
                self.assertEqual('NO_MATCH', result['status'])
                self.assertTrue(result['warnings'])

    async def test_ties_use_stable_id_and_experience_is_the_only_points(self):
        data = CatalogData()
        good = data.rows[0]
        data.rows = [{**good, 'lawyerId': 'b', 'experience': 42}, {**good, 'lawyerId': 'a', 'experience': 42}]
        for requested in [None, '2030-01-01']:
            result = await build_recommendation_graph(data, Interpretation(AREAS[0])).ainvoke({'requirement': CASES[0][0], 'date': requested})
            self.assertEqual(['a', 'b'], [r['lawyerId'] for r in result['recommendations']])
            self.assertEqual([42, 42], [r['score'] for r in result['recommendations']])
