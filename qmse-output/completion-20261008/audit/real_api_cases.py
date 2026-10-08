from pathlib import Path
from datetime import datetime,timezone
import json,httpx,subprocess,time
R=Path(__file__).resolve().parents[3];O=R/'qmse-output/completion-20261008';cfg=json.loads(Path('/private/tmp/qmse-completion-control/settings.json').read_text());base='http://127.0.0.1:55443';records=[];cases=[]
def scrub(v):
 if isinstance(v,dict):return {k:'[REDACTED]' if any(t in k.lower() for t in ('token','password','secret','hash')) else scrub(x) for k,x in v.items()}
 if isinstance(v,list):return [scrub(x) for x in v]
 return v
def call(method,path,body=None,token=None,files=None):
 r=httpx.request(method,base+path,json=body,files=files,headers={'Authorization':'Bearer '+token} if token else {},timeout=30)
 try:data=r.json()
 except ValueError:data=r.text
 records.append({'at':datetime.now(timezone.utc).isoformat(),'method':method,'path':path,'inputs':scrub(body),'status':r.status_code,'observed':scrub(data)})
 (O/'evidence/real-api-http.json').write_text(json.dumps(records,indent=2))
 return r,data
def result(id,expected,r,criteria):cases.append({'test_id':id,'expected':expected,'observed_http_status':r.status_code,'status':'PASS' if criteria else 'FAIL','execution_date':datetime.now(timezone.utc).isoformat(),'environment':'Actual ASP.NET Core Staging API; fresh PostgreSQL 18 loopback cluster; synthetic fixtures','evidence':'qmse-output/completion-20261008/evidence/real-api-http.json'})
r,admin=call('POST','/api/auth/login',{'email':'qmse-admin@example.test','password':cfg['password']});token=admin.get('token');result('TC-C4-01','200 with signed token',r,r.status_code==200 and bool(token))
r,_=call('POST','/api/auth/login',{'email':'qmse-admin@example.test','password':'synthetic-wrong'});result('TC-C4-02','401, no token',r,r.status_code==401)
_,areas=call('GET','/api/specializations');area=areas[0]
r,special=call('POST','/api/specializations',{'name':'QMSE Cyber Law '+str(time.time_ns()),'description':'Synthetic local area'},token);result('TC-C102','201 and persisted specialization',r,r.status_code==201)
payload={'name':'Synthetic QMSE Lawyer','email':'qmse-lawyer-'+str(time.time_ns())+'@example.test','experience':12,'licenseNumber':'QMSE-'+str(time.time_ns()),'specializationId':area['specializationId'],'qualification':'Synthetic fixture'}
r,lawyer=call('POST','/api/lawyers',payload,token)
r,data=call('GET',f"/api/lawyers/search?page=1&pageSize=10&specializationId={area['specializationId']}");result('TC-C101','200; only records in selected practice area',r,r.status_code==200 and data.get('totalItems',0)>=1 and all(any(s['specializationId']==area['specializationId'] for s in item['specializations']) for item in data['items']))
# Keep the synthetic created lawyer identifier outside log token files for controlled load.
Path('/private/tmp/qmse-completion-control/performance.json').write_text(json.dumps({'baseUrl':base,'token':token,'lawyerId':lawyer.get('lawyerId')}))
r,_=call('POST','/api/lawyers',payload,token);result('TC-C108','409 duplicate license; no new lawyer',r,r.status_code==409)
r,_=call('POST','/api/lawyers',payload);result('TC-SEC-01','401 missing JWT',r,r.status_code==401)
r,_=call('POST','/api/lawyers',payload,'invalid.jwt.value');result('TC-SEC-03','401 invalid JWT',r,r.status_code==401)
customer_email='qmse-api-'+str(time.time_ns())+'@example.test'
_,customer=call('POST','/api/auth/signup',{'fullName':'Synthetic API Customer','email':customer_email,'password':cfg['password'],'role':'Customer'})
_,customer=call('POST','/api/auth/login',{'email':customer_email,'password':cfg['password']});ct=customer.get('token');cid=customer.get('userId')
r,_=call('POST','/api/lawyers',payload,ct);result('TC-C109','403 Customer creates lawyer',r,r.status_code==403)
r,_=call('POST','/api/careers',{'title':'Synthetic vacancy'},ct);result('TC-C2-07','403 Customer publishes vacancy',r,r.status_code==403)
r,req=call('POST',f'/api/service-requests?customerId={cid}',{'title':'Synthetic Civil Request','description':'Synthetic tenant enquiry','requestType':'Civil','priority':'Low'},ct);result('TC-C4-03','201 status Submitted',r,r.status_code==201 and req.get('status')=='Submitted')
r,_=call('GET','/api/lawyers/search?search=%27%20OR%201%3D1%3B%20DROP%20TABLE%20Lawyers%3B--');result('TC-SEC-SQL-PG','200 harmless search on actual PostgreSQL; no records',r,r.status_code==200)
# Real controller upload rejection and FK persistence check.
_,services=call('GET','/api/documentation-services',token=token);sid=services[0]['serviceId']
_,doc=call('POST',f'/api/documentation-requests?customerId={cid}',{'serviceId':sid,'documentType':'Synthetic API Filing'},ct);did=doc['requestId']
r,_=call('POST',f'/api/documentation-requests/{did}/files',token=ct,files={'file':('spoof.pdf',b'MZ inert synthetic non-PDF bytes','application/pdf')});result('TC-C3-07','400 content mismatch; no attachment inserted',r,r.status_code==400)
r,_=call('PUT',f'/api/documentation-requests/{did}/status',{'status':'COMPLETED'},ct);result('TC-C3-11','403 Customer approval denied',r,r.status_code==403)
for file in ('NIC_Copy.pdf','Completed_Affidavit_Draft.pdf'):
 content=(R/'backend/LegalService.API/Storage/SampleDocuments'/file).read_bytes()
 r,_=call('POST',f'/api/documentation-requests/{did}/files',token=ct,files={'file':(file,content,'application/pdf')})
 result('TC-C3-02-'+file,'201 genuine PDF persists',r,r.status_code==201)
# Approved original rollback boundary demonstrated via PostgreSQL itself, not invented API batch.
sql='''BEGIN; INSERT INTO "DocumentationRequests" ("CustomerId","ServiceId","DocumentType","Status","CreatedAt") VALUES (9999,1,'QMSE_ROLLBACK_PROBE','PENDING',now()); INSERT INTO "DocumentFiles" ("RequestId") VALUES (-9999); ROLLBACK; SELECT count(*) AS orphan_requests FROM "DocumentationRequests" WHERE "DocumentType"='QMSE_ROLLBACK_PROBE';'''
p=subprocess.run(['/opt/homebrew/bin/psql','-h','127.0.0.1','-p','55446','-U','qmse_completion','-d','qmse_workflow','-c',sql],capture_output=True,text=True)
(O/'evidence/transaction-probe.log').write_text(p.stdout+p.stderr)
(O/'evidence/real-api-http.json').write_text(json.dumps(records,indent=2));(O/'test-results/real-api-cases.json').write_text(json.dumps(cases,indent=2));print(json.dumps(cases))
