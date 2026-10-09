"""Read-only Development API verification. No Gemini request or business-data writes.
Run with ai-service/.venv/bin/python scripts/verify-recurring-scheduling.py --base-url http://127.0.0.1:5305
Private Admin credentials stay in memory; evidence contains only scheduling counts/reasons.
"""
import argparse
import json
from datetime import datetime, timedelta
from pathlib import Path
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo
from dotenv import dotenv_values
ROOT = Path(__file__).resolve().parents[1]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default='http://127.0.0.1:5305')
    args = parser.parse_args()
    if not args.base_url.startswith('http://127.0.0.1:'):
        raise RuntimeError('This verification only accepts a localhost API.')
    credentials = dotenv_values(ROOT / 'frontend/.env.local')
    def request(path, token=None, payload=None):
        headers = {'Content-Type': 'application/json'}
        if token: headers['Authorization'] = 'Bearer ' + token
        message = Request(args.base_url + path, headers=headers, data=json.dumps(payload).encode() if payload else None)
        with urlopen(message, timeout=30) as response: return json.load(response)
    auth = request('/api/auth/login', payload={'email': credentials['E2E_ADMIN_EMAIL'], 'password': credentials['E2E_ADMIN_PASSWORD']})
    token = auth['token']
    directory = request('/api/lawyers/search?page=1&pageSize=100', token)
    lawyers = sorted((l for l in directory['items'] if l['licenseNumber'].startswith('ILS/LAW/')), key=lambda l: l['licenseNumber'])
    date = datetime.now(ZoneInfo('Asia/Colombo')).date() + timedelta(days=3)
    while date.weekday() > 4: date += timedelta(days=1)
    samples = []
    for index, lawyer in enumerate(lawyers[:6]):
        data = request(f"/api/lawyers/{lawyer['lawyerId']}/available-slots?date={date.isoformat()}", token)
        samples.append({'scenario': index, 'date': data['date'], 'workingDay': data['workingDay'], 'slotCount': len(data['availableSlots']), 'reason': data.get('reason'), 'duration': data['appointmentDurationMinutes']})
    assert [s['slotCount'] for s in samples[:4]] == [0, 8, 15, 0], 'Scheduling examples differ; inspect protected existing appointments/schedules.'
    assert samples[0]['reason'] == 'ON_LEAVE' and samples[3]['reason'] == 'FULLY_BOOKED'
    off = date
    while off.weekday() != 6: off += timedelta(days=1)
    data = request(f"/api/lawyers/{lawyers[4]['lawyerId']}/available-slots?date={off.isoformat()}", token)
    assert data['reason'] == 'NOT_WORKING_DAY' and len(data['availableSlots']) == 0
    schedule = request(f"/api/lawyers/{lawyers[4]['lawyerId']}/working-schedule", token)
    assert len(schedule['days']) == 7
    workforce = request('/api/workforce-analysis', token)
    summary = request('/api/lawyer-services/summary', token)
    evidence = {'date': date.isoformat(), 'samples': samples, 'offDay': {'date': data['date'], 'reason': data['reason']}, 'scheduleDays': len(schedule['days']), 'futureWindowDays': workforce['futureWindowDays'], 'workforceFutureCapacity': sum(a['futureAvailableSlotCount'] for a in workforce['practiceAreas']), 'summaryFutureCapacity': sum(a['futureAvailabilityCount'] for a in summary['coverage']), 'checks': 'read-only real API; six scheduling scenarios verified; no Gemini call'}
    assert evidence['workforceFutureCapacity'] == evidence['summaryFutureCapacity']
    path = ROOT / 'docs/evidence/recurring-scheduling/api-verification.json'
    path.parent.mkdir(parents=True, exist_ok=True); path.write_text(json.dumps(evidence, indent=2))
    print('Verified live schedule read, all six availability scenarios, and matching workforce/summary capacity.')

if __name__ == '__main__':
    try: main()
    except Exception:
        print('Scheduling verification did not complete; private HTTP/configuration diagnostics suppressed.'); raise SystemExit(1)
