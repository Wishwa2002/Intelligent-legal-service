from pathlib import Path
import subprocess,os,json,time,signal,secrets
R=Path.cwd();O=R/'qmse-output/final-audit/debug';C=Path('/private/tmp/qmse-final-debug-control');cfg=json.loads((C/'settings.json').read_text());pids=json.loads((C/'pids.json').read_text());os.kill(pids['backend'],signal.SIGTERM);time.sleep(1);key=secrets.token_hex(32);env=os.environ.copy()
for k in list(env):
 if any(x in k for x in ['GEMINI','GOOGLE_API','E2E_','MEMBER1_TEST_','LAWYER_MOBILE_TEST_']):env.pop(k,None)
env.update({'GEMINI_API_KEY':'','GOOGLE_API_KEY':'','PYTHON_DOTENV_DISABLED':'1','HF_HUB_OFFLINE':'1','TRANSFORMERS_OFFLINE':'1','ConnectionStrings__DefaultConnection':'Host=127.0.0.1;Port=55546;Database=qmse_history;Username=qmse_history;SSL Mode=Require','ASPNETCORE_ENVIRONMENT':'Staging','ASPNETCORE_URLS':'http://127.0.0.1:55543','Jwt__Key':secrets.token_hex(32),'Jwt__Issuer':'qmse-history','Jwt__Audience':'qmse-history','AiService__BaseUrl':'http://127.0.0.1:55544','Ai__BaseUrl':'http://127.0.0.1:55545','Ai__InternalKey':key,'AI_INTERNAL_KEY':key,'Cors__Origins__0':'http://127.0.0.1:55547','Cors__Origins__1':'http://127.0.0.1:55548','SeedAccounts__AdminEmail':'qmse-history-admin@example.test','SeedAccounts__AdminPassword':cfg['password'],'SeedAccounts__ClerkEmail':'qmse-history-clerk@example.test','SeedAccounts__ClerkPassword':cfg['password'],'BACKEND_API_URL':'http://127.0.0.1:55543'})
(C/'secondary-private.json').write_text(json.dumps({'internalKey':key}));(C/'secondary-private.json').chmod(0o600);children=[]
try:
 for name,args,cwd in [('replacement-api',['dotnet',str(R/'backend/LegalService.API/bin/Debug/net8.0/LegalService.API.dll')],R/'backend/LegalService.API'),('secondary-ai',[str(R/'ai-service/.venv/bin/python'),'-m','uvicorn','lawyer_recommendation.app:app','--host','127.0.0.1','--port','55545'],R/'ai-service')]:
  f=(O/'evidence'/f'{name}-server.log').open('w');p=subprocess.Popen(args,env=env,cwd=cwd,stdout=f,stderr=subprocess.STDOUT);children.append((name,p,f))
 (C/'secondary-pids.json').write_text(json.dumps({n:p.pid for n,p,f in children}))
 while not (C/'stop-secondary').exists():time.sleep(.5)
finally:
 for n,p,f in children:p.terminate()
 for n,p,f in children:
  try:p.wait(timeout=10)
  except subprocess.TimeoutExpired:p.kill()
  f.close()
