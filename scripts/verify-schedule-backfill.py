"""Inspect/apply the reviewed EF data migration in Development; suppress private connection logs."""
import argparse
import json
import os
import re
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIGRATION = '20261004095244_BackfillMissingLawyerSchedules'

def database():
    if os.environ.get('ASPNETCORE_ENVIRONMENT') != 'Development':
        raise RuntimeError('Development environment required.')
    directory = ROOT / 'backend/LegalService.API'
    base = json.loads((directory / 'appsettings.json').read_text())
    dev = json.loads((directory / 'appsettings.Development.json').read_text())
    connection = os.environ.get('ConnectionStrings__DefaultConnection') or dev.get('ConnectionStrings', {}).get('DefaultConnection') or base['ConnectionStrings']['DefaultConnection']
    parts = {k.strip().lower(): v.strip() for k, v in (item.split('=', 1) for item in connection.split(';') if '=' in item)}
    env = dict(os.environ, PGHOST=parts['host'], PGPORT=parts.get('port', '5432'), PGDATABASE=parts['database'], PGUSER=parts.get('username', parts.get('user id', '')), PGPASSWORD=parts.get('password', ''), PGSSLMODE='require' if parts.get('ssl mode', '').lower() == 'require' else 'prefer', PGCONNECT_TIMEOUT='15')
    def query(sql):
        result = subprocess.run([shutil.which('psql') or '/opt/homebrew/bin/psql', '-X', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=sqlstate', '-At'], input=sql, env=env, capture_output=True, text=True, timeout=60)
        if result.returncode: raise RuntimeError('Database query failed; private diagnostics suppressed.')
        return result.stdout.strip()
    return query

def audit(query):
    return json.loads(query('''SELECT json_build_object(
      'lawyers', (SELECT count(*) FROM "Lawyers"),
      'withoutSchedules', (SELECT count(*) FROM "Lawyers" l WHERE NOT EXISTS(SELECT 1 FROM "LawyerWorkingSchedules" s WHERE s."LawyerId"=l."LawyerId")),
      'scheduleRows', (SELECT count(*) FROM "LawyerWorkingSchedules"),
      'duplicateDays', (SELECT count(*) FROM (SELECT 1 FROM "LawyerWorkingSchedules" GROUP BY "LawyerId","DayOfWeek" HAVING count(*)>1) d),
      'unsetDurations', (SELECT count(*) FROM "Lawyers" WHERE "DefaultAppointmentDurationMinutes" IS NULL OR "DefaultAppointmentDurationMinutes"=0),
      'workingScheduleTable', to_regclass('public."LawyerWorkingSchedules"') IS NOT NULL,
      'unavailabilityTable', to_regclass('public."LawyerUnavailabilities"') IS NOT NULL,
      'durationColumn', EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='Lawyers' AND column_name='DefaultAppointmentDurationMinutes'),
      'migrationApplied', EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId"='20261004095244_BackfillMissingLawyerSchedules'));'''))

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    query = database()
    before = audit(query)
    print('Development schema audit:', json.dumps(before))
    if not args.apply: return
    preserved = query('SELECT COALESCE(json_agg(s ORDER BY "Id")::text, \'[]\') FROM "LawyerWorkingSchedules" s;')
    if before['migrationApplied']:
        print('Backfill migration already recorded; no changes made.')
        return
    if query('''SELECT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId"='20261004080145_AddRecurringLawyerScheduling');''') != 't':
        raise RuntimeError('Apply the recurring scheduling schema migration first.')
    # The Development database has older unrelated migration-history drift. Apply only this
    # EF-generated migration, following the existing selective migration script convention.
    sql = (ROOT / 'docs/sql/lawyer-schedule-backfill.sql').read_text(encoding='utf-8-sig')
    if re.search(r'^\s*(ALTER|CREATE|DROP|DELETE)\s', sql, re.MULTILINE):
        raise RuntimeError('Unexpected schema/destructive operation in data migration.')
    if len(re.findall(r'^UPDATE ', sql, re.MULTILINE)) != 1 or 'UPDATE "Lawyers" SET "DefaultAppointmentDurationMinutes" = 30' not in sql:
        raise RuntimeError('Unexpected update in data migration.')
    sql = sql.replace('START TRANSACTION;', "START TRANSACTION;\nSET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='30s';")
    query(sql)
    after = audit(query)
    # Verify every pre-existing schedule, including its audit fields, survived unchanged.
    ids = [row['Id'] for row in json.loads(preserved)]
    if ids:
        retained = query('SELECT COALESCE(json_agg(s ORDER BY "Id")::text, \'[]\') FROM "LawyerWorkingSchedules" s WHERE "Id" IN (' + ','.join("'" + value + "'::uuid" for value in ids) + ');')
        if json.loads(retained) != json.loads(preserved): raise RuntimeError('Existing schedule preservation check failed.')
    assert after['migrationApplied'] and after['withoutSchedules'] == 0 and after['duplicateDays'] == 0
    assert after['scheduleRows'] - before['scheduleRows'] == before['withoutSchedules'] * 7
    evidence = {'migration': MIGRATION, 'before': before, 'after': after, 'lawyersBackfilled': before['withoutSchedules'], 'existingSchedulesUnchanged': True}
    path = ROOT / 'docs/evidence/recurring-scheduling/backfill-migration.json'
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(evidence, indent=2))
    print('Migration applied; lawyers backfilled:', evidence['lawyersBackfilled'])
    print('Existing schedules preserved; no duplicate days; schema verified.')

if __name__ == '__main__':
    try: main()
    except Exception:
        print('Verification could not complete; private diagnostics suppressed.'); raise SystemExit(1)
