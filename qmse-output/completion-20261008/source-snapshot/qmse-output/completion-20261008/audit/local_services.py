from pathlib import Path
import os,subprocess,secrets,json,time,signal
R=Path(__file__).resolve().parents[3];O=R/'qmse-output/completion-20261008';control=Path('/private/tmp/qmse-completion-control');control.mkdir(exist_ok=True)
key=secrets.token_hex(32);password=secrets.token_urlsafe(18)
env=os.environ.copy();env.update({'ConnectionStrings__DefaultConnection':'Host=127.0.0.1;Port=55446;Database=qmse_workflow;Username=qmse_completion','ASPNETCORE_ENVIRONMENT':'Staging','ASPNETCORE_URLS':'http://127.0.0.1:55443','Jwt__Key':secrets.token_hex(32),'Jwt__Issuer':'qmse-isolated','Jwt__Audience':'qmse-isolated','AI_SERVICE_API_KEY':key,'AiService__BaseUrl':'http://127.0.0.1:55444','Ai__BaseUrl':'http://127.0.0.1:55445','Ai__InternalKey':key,'Cors__Origins__0':'http://127.0.0.1:55447','Cors__Origins__1':'http://127.0.0.1:55448','SeedAccounts__AdminEmail':'qmse-admin@example.test','SeedAccounts__AdminPassword':password,'SeedAccounts__ClerkEmail':'qmse-clerk@example.test','SeedAccounts__ClerkPassword':password,'BACKEND_API_URL':'http://127.0.0.1:55443','GEMINI_API_KEY':'','GOOGLE_API_KEY':'','PYTHON_DOTENV_DISABLED':'1','HF_HUB_OFFLINE':'1','TRANSFORMERS_OFFLINE':'1','AI_STATE_STORE':'backend','VITE_API_URL':'http://127.0.0.1:55443'})
(control/'settings.json').write_text(json.dumps({'password':password,'key':key}));(control/'settings.json').chmod(0o600)
commands=[('backend',['dotnet',str(R/'backend/LegalService.API/bin/Debug/net8.0/LegalService.API.dll')],R/'backend/LegalService.API'),('ai',[str(R/'ai-service/.venv/bin/python'),'-m','uvicorn','app.main:app','--host','127.0.0.1','--port','55444'],R/'ai-service'),('react',['npm','run','dev','--','--host','127.0.0.1','--port','55447'],R/'frontend'),('flutter-web',['/private/tmp/qmse-tools/bin/python','-m','http.server','55448','--bind','127.0.0.1'],R/'mobile/build/web')]
children=[]
try:
 for name,cmd,cwd in commands:
  if not cwd.exists():continue
  f=(O/'test-results'/f'{name}-server.log').open('w');p=subprocess.Popen(cmd,cwd=cwd,env=env,stdout=f,stderr=subprocess.STDOUT);children.append((name,p,f))
 (control/'pids.json').write_text(json.dumps({n:p.pid for n,p,f in children}))
 while not (control/'stop').exists():time.sleep(1)
finally:
 for n,p,f in children:p.terminate()
 for n,p,f in children:
  try:p.wait(timeout=10)
  except subprocess.TimeoutExpired:p.kill()
  f.close()
