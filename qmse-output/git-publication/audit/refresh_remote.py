from pathlib import Path
from datetime import datetime,timezone
import json,urllib.request,subprocess
G=Path('qmse-output/git-publication');sha='05359214df52fa743b234e1d77e6671f57c14dea';base='https://api.github.com/repos/Wishwa2002/Intelligent-legal-service';results={}
for name,path in [('sha-runs','/actions/runs?head_sha='+sha+'&per_page=100'),('branch-runs','/actions/runs?branch=se3110-qmse-testing&per_page=100'),('branch','/branches/se3110-qmse-testing')]:
 rec={'requested_utc':datetime.now(timezone.utc).isoformat(),'url':base+path}
 try:
  with urllib.request.urlopen(urllib.request.Request(base+path,headers={'Accept':'application/vnd.github+json','User-Agent':'SE3110-read-only-publication-verification'}),timeout=25) as r:rec.update(http_status=r.status,result=json.load(r))
 except Exception as e:rec['error']=str(e)
 results[name]=rec
(G/'evidence/final-remote-api-verification.json').write_text(json.dumps(results,indent=2));print(json.dumps({k:{'status':v.get('http_status'),'runs':v.get('result',{}).get('total_count'),'sha':v.get('result',{}).get('commit',{}).get('sha'),'error':v.get('error')} for k,v in results.items()},indent=2))
