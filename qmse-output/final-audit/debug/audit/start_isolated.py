from pathlib import Path
import os,json,secrets,subprocess,time
R=Path.cwd();O=R/'qmse-output/final-audit/debug';control=Path('/private/tmp/qmse-final-debug-control');control.mkdir(exist_ok=True);pg=Path('/private/tmp/qmse-final-debug-pg');assert not pg.exists(),'Do not reset an existing cluster';bin='/opt/homebrew/opt/postgresql@18/bin/'
meta=[]
def run(args):
 p=subprocess.run(args,capture_output=True,text=True);meta.append({'command':args,'exit_code':p.returncode,'stdout':p.stdout,'stderr':p.stderr});(O/'evidence/setup.json').write_text(json.dumps(meta,indent=2));assert p.returncode==0
run([bin+'initdb','-D',str(pg),'-U','qmse_history','-A','trust','--no-locale'])
run(['/usr/bin/openssl','req','-new','-x509','-days','2','-nodes','-subj','/CN=localhost','-keyout',str(pg/'server.key'),'-out',str(pg/'server.crt')]);(pg/'server.key').chmod(0o600)
with (pg/'postgresql.conf').open('a') as f:f.write("\nlisten_addresses='127.0.0.1'\nport=55546\nssl=on\nssl_cert_file='server.crt'\nssl_key_file='server.key'\n")
run([bin+'pg_ctl','-D',str(pg),'-l',str(control/'postgres-server.log'),'start','-w'])
run([bin+'createdb','-h','127.0.0.1','-p','55546','-U','qmse_history','qmse_history'])
password=secrets.token_urlsafe(22);env=os.environ.copy()
for k in list(env):
 if any(x in k for x in ['GEMINI','GOOGLE_API','E2E_','MEMBER1_TEST_','LAWYER_MOBILE_TEST_']):env.pop(k,None)
env.update({'ConnectionStrings__DefaultConnection':'Host=127.0.0.1;Port=55546;Database=qmse_history;Username=qmse_history;SSL Mode=Require','ASPNETCORE_ENVIRONMENT':'Staging','ASPNETCORE_URLS':'http://127.0.0.1:55543','Jwt__Key':secrets.token_hex(32),'Jwt__Issuer':'qmse-history','Jwt__Audience':'qmse-history','AI_SERVICE_API_KEY':secrets.token_hex(32),'AiService__BaseUrl':'http://127.0.0.1:55544','Ai__BaseUrl':'http://127.0.0.1:55545','Ai__InternalKey':secrets.token_hex(32),'Cors__Origins__0':'http://127.0.0.1:55547','Cors__Origins__1':'http://127.0.0.1:55548','SeedAccounts__AdminEmail':'qmse-history-admin@example.test','SeedAccounts__AdminPassword':password,'SeedAccounts__ClerkEmail':'qmse-history-clerk@example.test','SeedAccounts__ClerkPassword':password,'GEMINI_API_KEY':'','GOOGLE_API_KEY':'','PYTHON_DOTENV_DISABLED':'1','HF_HUB_OFFLINE':'1','TRANSFORMERS_OFFLINE':'1','BACKEND_API_URL':'http://127.0.0.1:55543','VITE_API_URL':'http://127.0.0.1:55543'})
(control/'settings.json').write_text(json.dumps({'password':password}));(control/'settings.json').chmod(0o600)
commands=[('backend',['dotnet',str(R/'backend/LegalService.API/bin/Debug/net8.0/LegalService.API.dll')],R/'backend/LegalService.API'),('ai',[str(R/'ai-service/.venv/bin/python'),'-m','uvicorn','app.main:app','--host','127.0.0.1','--port','55544'],R/'ai-service'),('react',['npm','run','dev','--','--host','127.0.0.1','--port','55547','--strictPort','--mode','test'],R/'frontend')]
children=[]
try:
 for name,args,cwd in commands:
  f=(O/'evidence'/f'{name}-server.log').open('w');p=subprocess.Popen(args,cwd=cwd,env=env,stdout=f,stderr=subprocess.STDOUT);children.append((name,p,f))
 (control/'pids.json').write_text(json.dumps({n:p.pid for n,p,f in children}))
 while not (control/'stop').exists():time.sleep(.5)
finally:
 for n,p,f in children:p.terminate()
 for n,p,f in children:
  try:p.wait(timeout=10)
  except subprocess.TimeoutExpired:p.kill()
  f.close()
 run([bin+'pg_ctl','-D',str(pg),'stop','-m','fast','-w'])
