"""Start the existing local services with consistent private configuration.
Run with ai-service/.venv/bin/python scripts/start-member1-local.py [--check].
Secret values are passed in process environments, never command arguments/output.
"""
import argparse
import os
import socket
import subprocess
import sys
from pathlib import Path
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parents[1]
PORTS = {'frontend': 5173, 'backend': 5295, 'agent': 8001, 'recommendation': 8002}


def service_environments(root=ROOT, inherited=None):
    inherited = dict(os.environ if inherited is None else inherited)
    # python-dotenv is also used by the AI services, including its whitespace/quote handling.
    values = {key: value for key, value in dotenv_values(root / 'ai-service/.env').items() if value is not None}
    backend_local = {key: value for key, value in dotenv_values(root / 'backend/LegalService.API/.env').items()
                     if key in ('ConnectionStrings__DefaultConnection', 'Jwt__Key') and value is not None}
    key = values.get('AI_INTERNAL_KEY')
    if not key or not key.strip():
        raise ValueError('Configure AI_INTERNAL_KEY in ai-service/.env; no value was changed.')
    if not values.get('GEMINI_API_KEY'):
        raise ValueError('Configure GEMINI_API_KEY in ai-service/.env; no value was changed.')
    python_env = {**inherited, **values}
    backend_env = {**backend_local, **inherited, 'ASPNETCORE_ENVIRONMENT': 'Development',
                   'Ai__BaseUrl': 'http://127.0.0.1:8002/', 'Ai__InternalKey': key}
    # ASP.NET configuration is case-insensitive: remove a stale differently-cased alias.
    for name in list(backend_env):
        if name.lower() in ('ai__internalkey', 'ai__baseurl') and name not in ('Ai__InternalKey', 'Ai__BaseUrl'):
            del backend_env[name]
    frontend_env = {**inherited, 'VITE_API_URL': 'http://127.0.0.1:5295'}
    for name in list(frontend_env):
        if name.lower() in ('ai_internal_key', 'ai__internalkey', 'gemini_api_key', 'ai_service_api_key'):
            del frontend_env[name]
    backend_env.pop('GEMINI_API_KEY', None)
    return {'agent': python_env, 'recommendation': python_env.copy(), 'backend': backend_env, 'frontend': frontend_env}


def commands(root=ROOT):
    windows = os.name == 'nt'
    python = root / 'ai-service' / ('.venv/Scripts/python.exe' if windows else '.venv/bin/python')
    if not python.exists(): python = Path(sys.executable)
    return {
        'agent': ([str(python), '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8001'], root / 'ai-service'),
        'recommendation': ([str(python), '-m', 'uvicorn', 'lawyer_recommendation.app:app', '--host', '127.0.0.1', '--port', '8002'], root / 'ai-service'),
        'backend': (['dotnet', 'run', '--no-launch-profile', '--urls', 'http://127.0.0.1:5295'], root / 'backend/LegalService.API'),
        'frontend': (['npm.cmd' if windows else 'npm', 'run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173', '--strictPort'], root / 'frontend'),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Check configuration without starting services or printing keys.')
    parser.add_argument('--services', nargs='+', choices=list(PORTS), default=list(PORTS))
    args = parser.parse_args()
    try: environments = service_environments()
    except ValueError as error: print(str(error), file=sys.stderr); return 1
    if args.check:
        print('Internal key configured and mapped consistently: yes')
        print('Gemini API key configured: yes')
        print('Gemini model:', environments['recommendation'].get('GEMINI_MODEL', '(existing default)'))
        print('Backend recommendation URL:', environments['backend']['Ai__BaseUrl'])
        print('Frontend API URL:', environments['frontend']['VITE_API_URL'])
        return 0
    for name in args.services:
        with socket.socket() as connection:
            if connection.connect_ex(('127.0.0.1', PORTS[name])) == 0:
                print(f'{name} port {PORTS[name]} is already in use. Stop that service before restarting it.', file=sys.stderr)
                return 1
    children = []
    try:
        for name in args.services:
            command, directory = commands()[name]
            children.append(subprocess.Popen(command, cwd=directory, env=environments[name]))
            print(f'Started {name} on {PORTS[name]}', flush=True)
        while children:
            for child in children:
                try: code = child.wait(timeout=0.2)
                except subprocess.TimeoutExpired: continue
                print('A selected service stopped. Stopping the other selected services.', file=sys.stderr)
                return code or 1
    except KeyboardInterrupt: return 0
    finally:
        for child in children:
            if child.poll() is None: child.terminate()
        for child in children:
            try: child.wait(timeout=10)
            except subprocess.TimeoutExpired: child.kill(); child.wait()


if __name__ == '__main__':
    raise SystemExit(main())
