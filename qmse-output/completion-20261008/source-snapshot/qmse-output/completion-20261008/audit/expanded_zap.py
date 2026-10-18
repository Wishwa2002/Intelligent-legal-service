from pathlib import Path
from datetime import datetime,timezone
import json,httpx,urllib.parse,time
R=Path(__file__).resolve().parents[3];O=R/'qmse-output/completion-20261008';cfg=json.loads(Path('/private/tmp/qmse-completion-control/performance.json').read_text());settings=json.loads(Path('/private/tmp/qmse-completion-control/settings.json').read_text());base=cfg['baseUrl'];assert base=='http://127.0.0.1:55443';zap='http://127.0.0.1:55449';records=[];started=datetime.now(timezone.utc).isoformat();secrets=[cfg['token'],settings['password'],settings['key']]
def z(path,params=None):return httpx.get(zap+path,params=params,timeout=30)
version=z('/JSON/core/view/version/').json()['version']
with httpx.Client(proxy=zap,timeout=20,trust_env=False) as client:
 probes=[('GET','/health',None,None),('GET','/api/lawyers/search',None,None),('GET',f"/api/lawyers/{cfg['lawyerId']}",None,None),('GET','/api/appointments',None,cfg['token']),('GET','/api/documentation-requests',None,cfg['token']),('GET','/api/documentation-services',None,cfg['token']),('GET','/api/service-requests',None,cfg['token']),('GET','/api/clerks',None,cfg['token']),('POST','/api/lawyers',{},None),('POST','/api/lawyers',{},'invalid.jwt.value'),('POST','/api/auth/login',{'email':'nonexistent@example.test','password':'synthetic-wrong'},None)]
 for q in ["' OR 1=1--","' UNION SELECT NULL--",'<script>alert(1)</script>',"'; DROP TABLE Lawyers;--"]:
  probes.append(('GET','/api/lawyers/search?search='+urllib.parse.quote(q),None,None))
 for method,path,body,token in probes:
  r=client.request(method,base+path,json=body,headers={'Authorization':'Bearer '+token} if token else {});records.append({'method':method,'path':path,'status':r.status_code,'headers':dict(r.headers),'response_bytes':len(r.content)})
for _ in range(30):
 pending=int(z('/JSON/pscan/view/recordsToScan/').json()['recordsToScan'])
 if not pending:break
 time.sleep(1)
def safe_write(name,text):
 for secret in secrets:text=text.replace(secret,'[REDACTED SYNTHETIC CREDENTIAL]')
 (O/'evidence'/name).write_text(text)
alerts=z('/JSON/core/view/alerts/',{'baseurl':base,'start':0,'count':1000}).json()
safe_write('zap-postgres-alerts.json',json.dumps(alerts,indent=2));safe_write('zap-postgres.html',z('/OTHER/core/other/htmlreport/').text);safe_write('zap-postgres.xml',z('/OTHER/core/other/xmlreport/').text)
metadata={'started_utc':started,'ended_utc':datetime.now(timezone.utc).isoformat(),'version':version,'target':base,'scan_type':'Expanded passive scan plus finite manual authentication/injection probes; no automated active scanner or spider','scope':'Real application Staging startup, actual middleware/controllers, isolated PostgreSQL 18, synthetic accounts; no production traffic','requests':records,'pending_records':pending,'alert_instances':len(alerts.get('alerts',[])),'manual_disposition':'Alert details require review; no claim of zero vulnerabilities or verified false positives','redaction':'Synthetic bearer/shared secrets/password replaced if encountered in generated reports'}
(O/'evidence/zap-postgres-metadata.json').write_text(json.dumps(metadata,indent=2));print(json.dumps(metadata))
