from pathlib import Path
import json,httpx,datetime,subprocess,uuid
P=Path('qmse-output/final-audit/debug');C=Path('/private/tmp/qmse-final-debug-control');cfg=json.loads((C/'settings.json').read_text());key=json.loads((C/'secondary-private.json').read_text())['internalKey'];rows=[]
def call(method,url,body=None,headers=None):
 r=httpx.request(method,url,json=body,headers=headers or {},timeout=20)
 try:d=r.json()
 except:d=r.text
 rows.append({'executed_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'method':method,'url':url,'inputs':body,'http':r.status_code,'observed':{k:v for k,v in d.items() if not any(s in k.lower() for s in ['token','secret','password'])} if isinstance(d,dict) else d});return r,d
_,login=call('POST','http://127.0.0.1:55543/api/auth/login',{'email':'qmse-history-admin@example.test','password':cfg['password']});rows[-1]['inputs']['password']='[REDACTED]';admin=login['token'];hdr={'Authorization':'Bearer '+admin};call('GET','http://127.0.0.1:55545/health');call('POST','http://127.0.0.1:55545/lawyer-recommendations',{'requirement':'Synthetic property dispute'});call('POST','http://127.0.0.1:55545/lawyer-recommendations',{'requirement':'Synthetic property dispute'}, {'X-Internal-Key':key});call('GET','http://127.0.0.1:55545/health')
r,areas=call('GET','http://127.0.0.1:55543/api/workforce-analysis',headers=hdr)
area=next(x for x in areas if x.get('status')!='HEALTHY') if isinstance(areas,list) else None
if area:call('POST','http://127.0.0.1:55543/api/workforce-analysis/suggestions',{'practiceAreaId':area['practiceAreaId']},hdr)
# Prepare the original duplicate-slot EF prerequisite before full backend regression.
_,lawyers=call('GET','http://127.0.0.1:55543/api/lawyers');lid=next(x['lawyerId'] for x in lawyers if x['name']=='Synthetic History Lawyer 1');_,slots=call('GET',f'http://127.0.0.1:55543/api/lawyers/{lid}/available-slots?date=2026-10-15');slot=next(x for x in slots['availableSlots'] if x['start']=='14:00:00');call('POST','http://127.0.0.1:55543/api/appointments',{'lawyerId':lid,'slotId':slot['slotId'],'customerId':str(uuid.UUID(int=3)),'consultationType':'Online'},hdr)
(P/'evidence/secondary-startup-probe.json').write_text(json.dumps(rows,indent=2));print([(r['method'],r['url'].split('555')[1],r['http']) for r in rows])
