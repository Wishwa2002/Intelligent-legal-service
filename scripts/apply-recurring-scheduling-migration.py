"""Apply only the reviewed EF recurring-scheduling migration to the Development DB.
Requires ASPNETCORE_ENVIRONMENT=Development. Credentials stay in process env.
Use --check for schema inspection, or --apply for the additive migration.
"""
import argparse
import json
import os
import re
import shutil
import subprocess
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
MIGRATION = '20261004080145_AddRecurringLawyerScheduling'

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--check', action='store_true'); group.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    if os.environ.get('ASPNETCORE_ENVIRONMENT') != 'Development':
        parser.error('This tool only accepts the Development environment.')
    directory = ROOT / 'backend/LegalService.API'
    config = json.loads((directory / 'appsettings.json').read_text())
    development = json.loads((directory / 'appsettings.Development.json').read_text())
    connection = os.environ.get('ConnectionStrings__DefaultConnection') or development.get('ConnectionStrings', {}).get('DefaultConnection') or config.get('ConnectionStrings', {}).get('DefaultConnection')
    parts = {key.strip().lower(): value.strip() for key, value in (piece.split('=', 1) for piece in connection.split(';') if '=' in piece)}
    env = dict(os.environ, PGHOST=parts['host'], PGPORT=parts.get('port', '5432'), PGDATABASE=parts['database'], PGUSER=parts.get('username', parts.get('user id', '')), PGPASSWORD=parts.get('password', ''), PGSSLMODE='require' if parts.get('ssl mode', '').lower() == 'require' else 'prefer')
    psql = shutil.which('psql') or '/opt/homebrew/bin/psql'
    def execute(sql):
        result = subprocess.run([psql, '-X', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=sqlstate', '-At'], input=sql, env=env, capture_output=True, text=True)
        if result.returncode:
            code = re.search(r'ERROR:\s+([0-9A-Z]{5})\b', result.stderr)
            if code: print('PostgreSQL error code:', code.group(1))
            raise RuntimeError('Database operation failed; transaction rolled back. Private connection diagnostics suppressed.')
        return result.stdout.strip()
    applied = execute(f'''SELECT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId"='{MIGRATION}');''') == 't'
    tables = execute('''SELECT to_regclass('public."LawyerWorkingSchedules"') IS NOT NULL AND to_regclass('public."LawyerUnavailabilities"') IS NOT NULL;''') == 't'
    print('Scheduling migration recorded:', applied); print('Scheduling tables present:', tables)
    if args.check: return 0
    if applied:
        if not tables: raise RuntimeError('Migration history and schema disagree; no changes made.')
        print('Already applied; no changes made.'); return 0
    sql = (ROOT / 'docs/sql/lawyer-recurring-scheduling.sql').read_text(encoding='utf-8-sig')
    # This is the SQL generated from the single EF migration, not all pending migrations.
    if re.search(r'^\s*(UPDATE|DELETE|DROP)\s', sql, re.MULTILINE):
        raise RuntimeError('Migration is not additive; no changes made.')
    sql = sql.replace('START TRANSACTION;', '''START TRANSACTION;
SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='30s';
DO $$ BEGIN
IF to_regclass('public."LawyerWorkingSchedules"') IS NOT NULL OR to_regclass('public."LawyerUnavailabilities"') IS NOT NULL THEN
RAISE EXCEPTION 'Partial schema exists; migration aborted'; END IF;
IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Specializations' AND column_name='SpecializationId' AND data_type='integer') THEN
RAISE EXCEPTION 'Practice Area key mismatch'; END IF;
END $$;''')
    execute(sql)
    print('Applied only the EF recurring scheduling migration; legacy availability and appointments preserved; weekly schedules backfilled.')
    return 0

if __name__ == '__main__':
    try: raise SystemExit(main())
    except (RuntimeError, KeyError, TypeError):
        print('Migration check/apply could not complete; private diagnostics suppressed.'); raise SystemExit(1)
