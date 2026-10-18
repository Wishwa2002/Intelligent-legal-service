import json,urllib.request,urllib.error,zipfile,io,datetime,subprocess
from pathlib import Path
P=Path('qmse-output/final-audit/evidence/ci');runs=json.loads((P/'selected-runs.json').read_text());seen=set();attempts=[]
for r in reversed(runs):
 key=(r['head_sha'],r['name'])
 if key in seen:continue
 seen.add(key);rid=r['id'];url=f'https://api.github.com/repos/Wishwa2002/Intelligent-legal-service/actions/runs/{rid}/logs'
 try:
  req=urllib.request.Request(url,headers={'User-Agent':'SE3110-read-only-evidence'})
  with urllib.request.urlopen(req,timeout=30) as res:data=res.read()
  with zipfile.ZipFile(io.BytesIO(data)) as z:
   for n in z.namelist():
    if n.endswith('.txt'):f=P/'logs'/str(rid)/n;f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes(z.read(n))
  (P/(str(rid)+'-native-logs.zip')).write_bytes(data);attempts.append({'run_id':rid,'result':'downloaded'})
 except Exception as e:attempts.append({'run_id':rid,'result':'blocked','error':str(e)})
print(json.dumps(attempts,indent=2));(P/'log-download-attempts.json').write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'attempts':attempts},indent=2))
