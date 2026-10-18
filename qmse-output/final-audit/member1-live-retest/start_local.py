from pathlib import Path
import os,json,secrets,subprocess,time,signal
from dotenv import dotenv_values
R=Path.cwd();O=R/'qmse-output/final-audit/member1-live-retest';C=Path('/private/tmp/qmse-c1-live-control');C.mkdir(exist_ok=True);C.chmod(0o700)
assert not (O/'provider-native.json').exists(), 'Preserved live evidence exists; rerunning requires a new approved budget and separate evidence directory'
pg=Path('/private/tmp/qmse-final-debug-pg');bin='/opt/homebrew/opt/postgresql@18/bin/';database='qmse_c1_retest_20261008'
assert (pg/'PG_VERSION').read_text().strip()=='18'
assert subprocess.run([bin+'pg_ctl','-D',str(pg),'status'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode!=0
f=open(O/'postgres-start.log','w');p=subprocess.run([bin+'pg_ctl','-D',str(pg),'-l',str(C/'postgres.log'),'start','-w'],stdout=f,stderr=subprocess.STDOUT);assert p.returncode==0
p=subprocess.run([bin+'createdb','-h','127.0.0.1','-p','55546','-U','qmse_history',database],capture_output=True);assert p.returncode==0,'Fresh database creation failed; existing DB will not be reset'
password=secrets.token_urlsafe(22);internal=secrets.token_hex(32);d=dotenv_values(R/'ai-service/.env');assert d.get('GEMINI_API_KEY','').strip();env=os.environ.copy()
for k in list(env):
 if any(w in k for w in ('GEMINI','GOOGLE_API','VERTEX','E2E_','MEMBER1_TEST_','LAWYER_MOBILE_TEST_','QMSE_HISTORY_')):env.pop(k,None)
env.update({'GEMINI_API_KEY':d['GEMINI_API_KEY'].strip(),'GEMINI_MODEL':d.get('GEMINI_MODEL') or 'gemini-3.8-flash','GOOGLE_API_KEY':'','PYTHON_DOTENV_DISABLED':'1','HF_HUB_OFFLINE':'1','TRANSFORMERS_OFFLINE':'1','ConnectionStrings__DefaultConnection':f'Host=127.0.0.1;Port=55546;Database={database};Username=qmse_history;SSL Mode=Require','ASPNETCORE_ENVIRONMENT':'Staging','ASPNETCORE_URLS':'http://127.0.0.1:55543','Jwt__Key':secrets.token_hex(32),'Jwt__Issuer':'qmse-c1-retest','Jwt__Audience':'qmse-c1-retest','Ai__BaseUrl':'http://127.0.0.1:55545','Ai__InternalKey':internal,'AI_INTERNAL_KEY':internal,'AI_SERVICE_API_KEY':secrets.token_hex(32),'SeedAccounts__AdminEmail':'qmse-c1-admin@example.test','SeedAccounts__AdminPassword':password,'SeedAccounts__ClerkEmail':'qmse-c1-clerk@example.test','SeedAccounts__ClerkPassword':password,'Workforce__ProposedHeadroomEnabled':'false','ProposedRules__Cancellation__Enabled':'false','ProposedRules__AtomicDocumentBatch':'false'})
(C/'private.json').write_text(json.dumps({'password':password,'database':database}));(C/'private.json').chmod(0o600)
(O/'connectivity-config.json').write_text(json.dumps({'key_detected':True,'key_source':'ai-service/.env','shell_override_removed':True,'google_api_key_cleared':True,'dotenv_secondary_loading_disabled':True,'model':env['GEMINI_MODEL'],'endpoint':'https://generativelanguage.googleapis.com/v1beta/models/'+env['GEMINI_MODEL']+':generateContent','model_reference':'https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash','max_live_requests':3,'classifier_outer_attempts':1,'sdk_attempts':1,'provider_timeout_ms':20000,'database':database,'production_access':False},indent=2))
with (O/'migration.log').open('w') as f:
 p=subprocess.run(['/Users/jeyam/.dotnet/tools/dotnet-ef','database','update','--no-build','--project','backend/LegalService.API/LegalService.API.csproj'],env=env,cwd=R,stdout=f,stderr=subprocess.STDOUT)
assert p.returncode==0,'Migration failed; inspect migration log'
children=[]
try:
 for name,args,cwd in [('api',['dotnet',str(R/'backend/LegalService.API/bin/Debug/net8.0/LegalService.API.dll')],R/'backend/LegalService.API'),('ai',[str(R/'ai-service/.venv/bin/python'),str(O/'live_service.py')],R/'ai-service')]:
  f=(O/(name+'-server.log')).open('w');p=subprocess.Popen(args,env=env,cwd=cwd,stdout=f,stderr=subprocess.STDOUT);children.append((name,p,f))
 (C/'pids.json').write_text(json.dumps({n:p.pid for n,p,f in children}))
 while not (C/'stop').exists():time.sleep(.5)
finally:
 for n,p,f in children:p.terminate()
 for n,p,f in children:
  try:p.wait(timeout=5)
  except subprocess.TimeoutExpired:p.kill()
  f.close()
 subprocess.run([bin+'pg_ctl','-D',str(pg),'stop','-m','fast','-w'],stdout=subprocess.DEVNULL)
 (O/'cleanup.json').write_text(json.dumps({'owned_services_stopped':True,'isolated_cluster_stopped':True,'database_retained':database,'production_data_modified':False}))
