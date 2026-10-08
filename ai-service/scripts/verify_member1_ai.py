"""Read-only live Member 1 evaluation. No workflow, customer, slot, or appointment is written."""
import asyncio
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from dotenv import load_dotenv
from lawyer_recommendation.agent import build_recommendation_graph
from lawyer_recommendation.gemini import GeminiUnavailable

CASES = [
    ('Corporate', 'I need a lawyer to review a commercial contract.', 'Corporate & Commercial Law'),
    ('Criminal', 'I have been charged with an offence and need legal representation.', 'Criminal Law'),
    ('Employment', 'My employer terminated me without proper notice.', 'Labour & Employment Law'),
    ('Property', 'I have a dispute about ownership of my land.', 'Real Estate & Property Law'),
    ('Tax', 'I received a tax assessment that I believe is incorrect.', 'Tax Law'),
    ('Unsupported Family', 'I need help with divorce and child custody.', None),
    ('Nonsense', 'banana rocket purple chair', None),
]

async def main():
    load_dotenv(Path(__file__).resolve().parents[1] / '.env')
    # Only user-supplied test requirements and area names go to Gemini.
    # There is no project database access and no practitioner/customer data.
    names = [case[2] for case in CASES[:5]]
    areas = [{'id': index, 'name': name} for index, name in enumerate(names, 1)]
    services = []
    candidates = []
    class Data:
        async def catalogs(self): return areas, services
        async def candidates(self, specialization_ids, date=None): return candidates
    output = Path(__file__).resolve().parents[2] / 'docs/member1-live-ai-results.json'
    previous = json.loads(output.read_text()) if '--retry-failed' in sys.argv and output.exists() else None
    cases = [case for case in CASES if not previous or any(r['case'] == case[0] and r['result'] == 'FAIL' for r in previous['results'])]
    results = []
    semaphore = asyncio.Semaphore(1)
    async def evaluate(label, text, expected):
        async with semaphore:
            try:
                result = await build_recommendation_graph(Data()).ainvoke({'requirement': text, 'limit': 5})
                actual = result['parsedRequirement']['categoryName']
                passed = actual == expected and (expected is not None or (result['status'] == 'UNSUPPORTED' and not result['recommendations']))
                entry = {'case': label, 'requirement': text, 'expected': expected, 'actual': actual,
                         'status': result['status'], 'recommendationCount': len(result['recommendations']), 'result': 'PASS' if passed else 'FAIL'}
            except Exception as error:
                # Do not include provider responses, headers, key-bearing URLs, or raw exception details.
                entry = {'case': label, 'expected': expected, 'result': 'FAIL', 'errorType': type(error).__name__,
                         'error': str(error) if isinstance(error, GeminiUnavailable) else 'Live evaluation could not complete'}
            print(json.dumps(entry), flush=True)
            results.append(entry)
    await asyncio.gather(*(evaluate(*case) for case in cases))
    by_case = {r['case']: r for r in previous['results']} if previous else {}
    by_case.update({r['case']: r for r in results})
    final_results = [by_case[case[0]] for case in CASES]
    attempts = previous.get('attempts', [previous['results']]) if previous else []
    output.write_text(json.dumps({'mode': 'live Gemini classification using only user-supplied test text and Practice Area names; no database access',
                                 'attempts': attempts + [results], 'results': final_results}, indent=2) + '\n')
    return 0 if all(r['result'] == 'PASS' for r in final_results) else 1

if __name__ == '__main__':
    raise SystemExit(asyncio.run(main()))
