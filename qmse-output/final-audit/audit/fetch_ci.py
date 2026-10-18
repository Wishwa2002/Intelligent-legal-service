from pathlib import Path
import urllib.request,urllib.error,json,datetime
P=Path('qmse-output/final-audit/evidence/ci');repo='Wishwa2002/Intelligent-legal-service';base='https://api.github.com/repos/'+repo
queries={s:'/actions/runs?head_sha='+s+'&per_page=100' for s in ['8a9b8a24f5a567460f90e60b3b6675ed02230062','54aecccc780e99ee0bded70338277bccbfac76cd','6d982e60aa65af54d39d0beac4f527abcd785820','fb471202376f4684dafa5fdcda7f20f046b2e606','05359214df52fa743b234e1d77e6671f57c14dea']}
allruns=[];attempts=[]
def get(path):
 req=urllib.request.Request(base+path,headers={'User-Agent':'SE3110-QMSE-read-only-audit','Accept':'application/vnd.github+json'})
 with urllib.request.urlopen(req,timeout=30) as r:return json.load(r)
for sha,q in queries.items():
 try:
  obj=get(q);(P/(sha[:8]+'-runs.json')).write_text(json.dumps(obj,indent=2));print(sha[:8],obj['total_count'])
  for r in obj['workflow_runs']:
   if r['name'] not in ['Backend CI','Frontend CI','Mobile CI']:continue
   allruns.append(r);jobs=get('/actions/runs/'+str(r['id'])+'/jobs?per_page=100');(P/(str(r['id'])+'-jobs.json')).write_text(json.dumps(jobs,indent=2));print(' ',r['id'],r['name'],r['conclusion'])
 except Exception as e:attempts.append({'sha':sha,'error':str(e)})
(P/'selected-runs.json').write_text(json.dumps(allruns,indent=2));(P/'fetch-attempts.json').write_text(json.dumps({'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'errors':attempts},indent=2))
