from pathlib import Path
import json,time,httpx,sys,datetime
O=Path('qmse-output/final-audit/security');label=sys.argv[1];base='http://127.0.0.1:55543';zap='http://127.0.0.1:55549';started=datetime.datetime.now(datetime.timezone.utc).isoformat();records=[]
with httpx.Client(trust_env=False,timeout=30) as client:
 def z(p,params=None):return client.get(zap+p,params=params).raise_for_status()
 for _ in range(30):
  try:version=z('/JSON/core/view/version/').json()['version'];break
  except Exception:time.sleep(1)
 z('/JSON/core/action/newSession/',{'name':'/private/tmp/qmse-final-security-zap/'+label,'overwrite':'true'})
 with httpx.Client(proxy=zap,trust_env=False,timeout=20) as target:
  for path in ['/health','/api/lawyers/search','/api/specializations','/api/appointments','/api/documentation-requests','/api/no-such-synthetic-route']:
   r=target.get(base+path);records.append({'method':'GET','path':path,'status':r.status_code,'nosniff':r.headers.get('x-content-type-options'),'bytes':len(r.content)})
 for _ in range(30):
  pending=int(z('/JSON/pscan/view/recordsToScan/').json()['recordsToScan'])
  if pending==0:break
  time.sleep(1)
 alerts=z('/JSON/core/view/alerts/',{'baseurl':base,'start':0,'count':1000}).json()
 (O/f'zap-{label}-alerts.json').write_text(json.dumps(alerts,indent=2));(O/f'zap-{label}.html').write_bytes(z('/OTHER/core/other/htmlreport/').content);(O/f'zap-{label}.xml').write_bytes(z('/OTHER/core/other/xmlreport/').content)
 meta={'scan_type':'Passive only; six deliberate unauthenticated local GET requests; no spider or active scanner','version':version,'target':base,'started_utc':started,'ended_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'requests':records,'pending':pending,'alert_count':len(alerts['alerts']),'limitation':'Limited paths; no vulnerability-free claim; isolated PostgreSQL, synthetic fixtures, loopback HTTP; no credentials sent to proxy.'}
 (O/f'zap-{label}-metadata.json').write_text(json.dumps(meta,indent=2));print(json.dumps(meta))
