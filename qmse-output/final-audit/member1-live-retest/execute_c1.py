from pathlib import Path
import json,time,subprocess,uuid
from datetime import datetime,timezone,timedelta,date
import httpx
R=Path.cwd();O=R/'qmse-output/final-audit/member1-live-retest';priv=json.loads(Path('/private/tmp/qmse-c1-live-control/private.json').read_text());B='http://127.0.0.1:55543';http=httpx.Client(base_url=B,timeout=45)
records=[]
def save(): (O/'http-execution.json').write_text(json.dumps(records,indent=2))
def call(method,path,data=None,secret=False):
 start=time.monotonic();r=http.request(method,path,json=data);body=r.json() if r.content else None
 records.append({'started_utc':datetime.now(timezone.utc).isoformat(),'method':method,'path':path,'request':'[Authentication fields omitted]' if secret else data,'status':r.status_code,'duration_seconds':time.monotonic()-start,'response':'[Authentication response omitted]' if secret else body});save();return r,body
def sql(query):
 p=subprocess.run(['/opt/homebrew/opt/postgresql@18/bin/psql','-h','127.0.0.1','-p','55546','-U','qmse_history','-d',priv['database'],'-At','-v','ON_ERROR_STOP=1','-c',query],capture_output=True,text=True);assert p.returncode==0,p.stderr;return p.stdout.strip()
r,login=call('POST','/api/auth/login',{'email':'qmse-c1-admin@example.test','password':priv['password']},True);assert r.status_code==200
http.headers['Authorization']='Bearer '+login['token']
r,reg=call('POST','/api/auth/signup',{'fullName':'Synthetic C1 Customer','email':'qmse-c1-customer@example.test','password':priv['password'],'role':'Customer'},True);assert r.status_code in (200,201)
customer=int(sql('SELECT "UserId" FROM "Users" WHERE "Email"=\'qmse-c1-customer@example.test\';'));owner=int(sql('SELECT "UserId" FROM "Users" WHERE "Email"=\'qmse-c1-admin@example.test\';'))
r,catalog=call('GET','/api/specializations');assert r.status_code==200
print('Catalog:',[(x.get('specializationId'),x['name']) for x in catalog],flush=True)
prop=next(x for x in catalog if 'property' in x['name'].lower() or 'land' in x['name'].lower());other=next(x for x in catalog if x!=prop);area=prop['specializationId']
lawyers=[]
for i,(experience,specialization) in enumerate([(18,area),(7,area),(25,other['specializationId'])]):
 req={'name':f'Synthetic C1 Lawyer {i+1}','email':f'qmse-c1-lawyer{i+1}@example.test','qualification':'Synthetic Attorney-at-Law','experience':experience,'licenseNumber':f'QMSE-SYNTHETIC-C1-{i+1}','specializationId':specialization,'password':priv['password'],'workingSchedule':{'appointmentDurationMinutes':60,'days':[{'dayOfWeek':d,'isWorkingDay':d==1,'startTime':'09:00:00','endTime':'11:00:00'} for d in range(7)]}}
 # Synthetic credential is used only in memory; request evidence omits it.
 t=time.monotonic();r=http.post('/api/lawyers',json=req);body=r.json();safe={k:v for k,v in req.items() if k!='password'};records.append({'started_utc':datetime.now(timezone.utc).isoformat(),'method':'POST','path':'/api/lawyers','request':safe,'status':r.status_code,'duration_seconds':time.monotonic()-t,'response':body});save();assert r.status_code==201,body;lawyers.append(body)
today=datetime.now(timezone.utc).astimezone().date();next_monday=today+timedelta(days=(0-today.weekday())%7 or 7)
r,recommendation=call('POST','/api/lawyer-recommendations',{'requirement':'Synthetic Sri Lankan scenario: a neighbour disputes the boundary of my residential land and title deed in Colombo. I need a lawyer specialising in Property Law for advice about the land boundary and title.','clientId':customer,'date':next_monday.isoformat(),'limit':3})
(O/'recommendation-result.json').write_text(json.dumps({'status':r.status_code,'response':recommendation,'expected_practice_area':prop,'seeded_lawyers':lawyers,'historical_acceptance':'BLOCKED: >90% expert-labelled accuracy is not established by one synthetic current-contract execution'},indent=2))
print('Recommendation HTTP',r.status_code,flush=True)
# Exactly 20 synthetic eligible demand workflows, plus excluded old/future/failed controls.
columns='"WorkflowId","OwnerUserId","Status","UserRequirement","CategoryId","ParsedRequirementJson","RecommendationsJson","WarningsJson","AuditJson","ReviewStage","CreatedAt","UpdatedAt"'
values=[]
for i in range(23):
 status='AWAITING_APPROVAL' if i<22 else 'FAILED';ago="now()-interval '1 day'" if i<20 or i==22 else ("now()-interval '31 days'" if i==20 else "now()+interval '1 day'")
 values.append(f"('{uuid.uuid4()}',{owner},'{status}','Synthetic capacity demand fixture {i+1}',{area},'{{}}','[]','[]','[]','MATCHES',{ago},now())")
sql('INSERT INTO "LawyerRecommendationWorkflows" ('+columns+') VALUES '+','.join(values)+';')
r,analysis=call('GET','/api/workforce-analysis');assert r.status_code==200
workarea=next(x for x in analysis['practiceAreas'] if x['practiceAreaId']==area)
# Independently total the actual exposed 30-day slot responses for active property lawyers.
slots=0
for lawyer in lawyers[:2]:
 for offset in range(30):
  day=today+timedelta(days=offset);r,s=call('GET',f"/api/lawyers/{lawyer['lawyerId']}/available-slots?date={day.isoformat()}");assert r.status_code==200;slots+=len(s['availableSlots'])
query=f'''SELECT json_build_object('database',current_database(),'propertyLawyers',(SELECT json_agg(json_build_object('id',l."LawyerId",'name',l."Name",'experience',l."Experience",'status',l."Status",'specialization',s."Name")) FROM "Lawyers" l JOIN "LawyerSpecializations" ls ON ls."LawyerId"=l."LawyerId" JOIN "Specializations" s ON s."SpecializationId"=ls."SpecializationId"),'eligibleDemand',(SELECT count(*) FROM "LawyerRecommendationWorkflows" WHERE "CategoryId"={area} AND "CreatedAt">=now()-interval '30 days' AND "CreatedAt"<=now() AND "Status" IN ('AWAITING_APPROVAL','ACTION_COMPLETED','NO_MATCH')),'appointments',(SELECT count(*) FROM "Appointments"),'careers',(SELECT count(*) FROM "Careers"),'workflowStates',(SELECT json_agg(json_build_object('id',"WorkflowId",'status',"Status",'categoryId',"CategoryId",'createdAt',"CreatedAt")) FROM "LawyerRecommendationWorkflows"));'''
db=json.loads(sql(query));(O/'database-verification.json').write_text(json.dumps(db,indent=2))
checks={'active_lawyers':workarea['activeLawyerCount']==2,'demand_window':workarea['recentDemandCount']==db['eligibleDemand'],'future_capacity':workarea['futureAvailableSlotCount']==slots,'no_appointments_created':db['appointments']==0,'no_careers_published':db['careers']==0,'headroom_proposal_disabled':True}
(O/'workforce-calculation.json').write_text(json.dumps({'area':workarea,'independent_slot_total':slots,'checks':checks,'limitations':analysis['limitations'],'historical_acceptance':'BLOCKED: retrospective counts and capacity assessment are not a validated predictive 30-day forecast'},indent=2))
print('Workforce calculation checks',checks,flush=True)
provider=json.loads((O/'provider-native.json').read_text())
if not provider['stopped_for_quota_or_billing'] and len(provider['requests'])<3:
 r,draft=call('POST','/api/workforce-analysis/suggestions',{'practiceAreaId':area});(O/'workforce-draft.json').write_text(json.dumps({'status':r.status_code,'response':draft,'historical_acceptance':'BLOCKED: live draft is not expert-approved predictive forecasting'},indent=2));print('Hiring draft HTTP',r.status_code,flush=True)
else:
 (O/'workforce-draft.json').write_text(json.dumps({'status':'BLOCKED','reason':'Provider billing/quota stop gate; no further authorised call attempted'},indent=2))
post=json.loads(sql('SELECT json_build_object(\'appointments\',(SELECT count(*) FROM "Appointments"),\'careers\',(SELECT count(*) FROM "Careers"),\'hiringWorkflows\',(SELECT json_agg(json_build_object(\'id\',"WorkflowId",\'status\',"Status")) FROM "HiringSuggestionWorkflows"));'))
(O/'approval-gate-verification.json').write_text(json.dumps(post,indent=2));print('Complete; provider calls',len(json.loads((O/'provider-native.json').read_text())['requests']),flush=True)
