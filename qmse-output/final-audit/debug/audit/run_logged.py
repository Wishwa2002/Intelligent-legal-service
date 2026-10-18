from pathlib import Path
from datetime import datetime,timezone
import os,json,subprocess,time,sys
R=Path.cwd();O=R/'qmse-output/final-audit/debug';name=sys.argv[1];cwd=R/sys.argv[2];args=sys.argv[3:];env=os.environ.copy()
for k in list(env):
 if k.startswith(('GEMINI','GOOGLE_API','MEMBER1_TEST_','LAWYER_MOBILE_TEST_','E2E_')):env.pop(k,None)
env.update({'GEMINI_API_KEY':'qmse-synthetic-not-a-real-provider-key','GOOGLE_API_KEY':'qmse-synthetic-not-a-real-provider-key','PYTHON_DOTENV_DISABLED':'1','HF_HUB_OFFLINE':'1','TRANSFORMERS_OFFLINE':'1','DOTNET_CLI_HOME':str(R/'qmse-output/.dotnet')})
env['QMSE_HISTORY_POSTGRES']='Host=127.0.0.1;Port=55546;Database=qmse_history;Username=qmse_history;SSL Mode=Require'
try:env['QMSE_HISTORY_PASSWORD']=json.load(open('/private/tmp/qmse-final-debug-control/settings.json'))['password']
except FileNotFoundError:pass
if name=='regression-backend-postgres' or name.startswith(('issue5-','issue6-')):
 env['MEMBER1_TEST_POSTGRES']='Host=127.0.0.1;Port=55546;Database=postgres;Username=qmse_history;SSL Mode=Require'
 env['LAWYER_MOBILE_TEST_POSTGRES']=env['MEMBER1_TEST_POSTGRES']
start=datetime.now(timezone.utc).isoformat();t=time.monotonic()
with (O/'evidence'/f'{name}.log').open('w') as f:
 p=subprocess.run(args,cwd=cwd,env=env,stdout=f,stderr=subprocess.STDOUT)
meta={'command':args,'cwd':str(cwd),'started_utc':start,'ended_utc':datetime.now(timezone.utc).isoformat(),'duration_seconds':round(time.monotonic()-t,3),'exit_code':p.returncode,'environment':'macOS ARM64; provider credentials disabled; synthetic fixtures','log':str((O/'evidence'/f'{name}.log').relative_to(R))};(O/'test-results'/f'{name}.json').write_text(json.dumps(meta,indent=2));print(json.dumps(meta))
