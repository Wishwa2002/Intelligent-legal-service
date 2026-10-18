from pathlib import Path
import os,json,secrets,subprocess,signal,time
R=Path.cwd();O=R/'qmse-output/historical-resolution';c=Path('/private/tmp/qmse-history-control');password=json.loads((c/'settings.json').read_text())['password'];pids=json.loads((c/'pids.json').read_text());os.kill(pids['backend'],signal.SIGTERM);time.sleep(1)
env=os.environ.copy()
for k in list(env):
 if any(x in k for x in ['GEMINI','GOOGLE_API','E2E_','MEMBER1_TEST_','LAWYER_MOBILE_TEST_']):env.pop(k,None)
env.update({'ConnectionStrings__DefaultConnection':'Host=127.0.0.1;Port=55546;Database=qmse_history;Username=qmse_history;SSL Mode=Require','ASPNETCORE_ENVIRONMENT':'Staging','ASPNETCORE_URLS':'http://127.0.0.1:55543','Jwt__Key':secrets.token_hex(32),'Jwt__Issuer':'qmse-history','Jwt__Audience':'qmse-history','AiService__BaseUrl':'http://127.0.0.1:55544','Ai__BaseUrl':'http://127.0.0.1:55545','Ai__InternalKey':secrets.token_hex(32),'Cors__Origins__0':'http://127.0.0.1:55547','Cors__Origins__1':'http://127.0.0.1:55548','SeedAccounts__AdminEmail':'qmse-history-admin@example.test','SeedAccounts__AdminPassword':password,'SeedAccounts__ClerkEmail':'qmse-history-clerk@example.test','SeedAccounts__ClerkPassword':password})
with (O/'evidence/backend-cors-server.log').open('w') as f:
 p=subprocess.Popen(['dotnet',str(R/'backend/LegalService.API/bin/Debug/net8.0/LegalService.API.dll')],cwd=R/'backend/LegalService.API',env=env,stdout=f,stderr=subprocess.STDOUT);(c/'replacement-api-pid.json').write_text(json.dumps({'pid':p.pid}));
 try:
  while not (c/'stop-replacement').exists():time.sleep(.5)
 finally:p.terminate();p.wait(timeout=15)
