"""Explicit, idempotent Development Admin setup using the approved private E2E source.
Run with ai-service/.venv/bin/python scripts/seed-member1-development-admin.py.
No secrets are printed or passed as command arguments. Existing accounts are unchanged.
"""
import os
import subprocess
from pathlib import Path
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parents[1]


def main():
    source = ROOT / 'frontend/.env.local'
    relative = str(source.relative_to(ROOT))
    ignored = subprocess.run(['git', 'check-ignore', relative], cwd=ROOT, capture_output=True)
    tracked = subprocess.run(['git', 'ls-files', '--error-unmatch', relative], cwd=ROOT, capture_output=True)
    if ignored.returncode != 0 or tracked.returncode == 0:
        print('Admin setup requires an ignored, untracked private credential file.')
        return 1
    values = dotenv_values(source)
    if not all(values.get(key) and values[key].strip() for key in ('E2E_ADMIN_EMAIL', 'E2E_ADMIN_PASSWORD')):
        print('Both private E2E Admin variables must be configured.')
        return 1
    environment = dict(os.environ, ASPNETCORE_ENVIRONMENT='Development', DOTNET_ENVIRONMENT='Development',
                       SeedAccounts__AdminEmail=values['E2E_ADMIN_EMAIL'],
                       SeedAccounts__AdminPassword=values['E2E_ADMIN_PASSWORD'],
                       Logging__LogLevel__Default='None')
    result = subprocess.run(['dotnet', 'run', '--no-build', '--no-launch-profile', '--', '--seed-development-admin'],
                            cwd=ROOT / 'backend/LegalService.API', env=environment, capture_output=True, text=True)
    if result.returncode:
        print('Development Admin setup failed; private diagnostics suppressed.')
        return 1
    print('Development Admin setup completed; existing accounts were not reset or promoted.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
