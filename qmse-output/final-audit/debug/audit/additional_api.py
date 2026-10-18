from pathlib import Path
import json,time
from datetime import datetime,timezone
import httpx
R=Path.cwd();O=R/'qmse-output/final-audit/debug';cfg=json.load(open('/private/tmp/qmse-final-debug-control/settings.json'));base='http://127.0.0.1:55543';records=[]
with httpx.Client(timeout=12) as c:
 r=c.post(base+'/api/auth/login',json={'email':'qmse-history-admin@example.test','password':cfg['password']});r.raise_for_status();token=r.json()['token']
 for target,path,body in [(base,'/api/ai/scheduling/classify',{'message':'Book for tomorrow at 10 AM'}),('http://127.0.0.1:55544','/api/ai/scheduling/classify',{'message':'Book for tomorrow at 10 AM'}),(base,'/api/workforce-analysis/suggestions',{'practiceAreaId':4})]:
  t=time.monotonic();r=c.post(target+path,json=body,headers={'Authorization':'Bearer '+token});records.append({'at':datetime.now(timezone.utc).isoformat(),'target':target,'method':'POST','path':path,'inputs':body,'http':r.status_code,'actual':r.text,'latency_ms':(time.monotonic()-t)*1000})
(O/'evidence/additional-http.json').write_text(json.dumps(records,indent=2));print([(r['path'],r['http']) for r in records])
