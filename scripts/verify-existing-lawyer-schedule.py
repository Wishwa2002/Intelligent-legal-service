"""Verify an existing Development lawyer's schedule edit/save and restore its original values.
Only edit an off-day time field (no change to bookable hours). No Gemini requests.
"""
import argparse
import copy
import json
from pathlib import Path
from urllib.request import Request, urlopen
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parents[1]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default='http://127.0.0.1:5295')
    args = parser.parse_args()
    if not args.base_url.startswith('http://127.0.0.1:'): raise RuntimeError('Local Development API required.')
    token = None
    def request(path, method='GET', payload=None):
        headers = {'Content-Type': 'application/json'}
        if token: headers['Authorization'] = 'Bearer ' + token
        message = Request(args.base_url + path, method=method, headers=headers, data=json.dumps(payload).encode() if payload is not None else None)
        with urlopen(message, timeout=30) as response:
            return json.load(response) if response.status != 204 else None
    credentials = dotenv_values(ROOT / 'frontend/.env.local')
    auth = request('/api/auth/login', 'POST', {'email': credentials['E2E_ADMIN_EMAIL'], 'password': credentials['E2E_ADMIN_PASSWORD']})
    token = auth['token']
    lawyers = sorted((l for l in request('/api/lawyers/search?page=1&pageSize=100')['items'] if l['licenseNumber'].startswith('ILS/LAW/')), key=lambda l: l['licenseNumber'])
    lawyer = lawyers[4]
    path = f"/api/lawyers/{lawyer['lawyerId']}/working-schedule"
    original = request(path)
    assert original['hasConfiguredSchedule'] and len(original['days']) == 7
    payload = {'appointmentDurationMinutes': original['appointmentDurationMinutes'], 'days': original['days']}
    edited = copy.deepcopy(payload)
    off = next(d for d in edited['days'] if not d['isWorkingDay'])
    off['startTime'] = '09:15:00' if off['startTime'] != '09:15:00' else '09:30:00'
    try:
        saved = request(path, 'PUT', edited)
        assert saved['days'] == edited['days'] and saved['hasConfiguredSchedule']
        loaded = request(path)
        assert loaded['days'] == edited['days']
    finally:
        request(path, 'PUT', payload)
        restored = request(path)
        assert restored['days'] == original['days'] and restored['appointmentDurationMinutes'] == original['appointmentDurationMinutes']
    leaves = request(f"/api/lawyers/{lawyer['lawyerId']}/unavailability")
    evidence = {'lawyerId': lawyer['lawyerId'], 'scheduleRead': True, 'scheduleEditSaved': True,
        'readAfterSave': True, 'originalValuesRestored': True, 'unavailabilityRead': isinstance(leaves, list),
        'scheduleDays': len(restored['days']), 'duration': restored['appointmentDurationMinutes'],
        'change': 'Temporary off-day start-time edit only; working hours and duration preserved.'}
    (ROOT / 'docs/evidence/recurring-scheduling/existing-lawyer-save.json').write_text(json.dumps(evidence, indent=2))
    print('Existing lawyer: schedule GET, edited PUT, read-after-save and original-value restore verified; leave GET works.')

if __name__ == '__main__':
    try: main()
    except Exception:
        print('Schedule save verification did not complete; private HTTP/configuration diagnostics suppressed.'); raise SystemExit(1)
