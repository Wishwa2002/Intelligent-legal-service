from pathlib import Path
import json,urllib.request
P=Path('qmse-output/final-audit/evidence/ci');runs=json.loads((P/'selected-runs.json').read_text());seen=set();selected=[]
for r in runs:
 k=(r['head_sha'],r['name'])
 if k in seen:continue
 seen.add(k);selected.append(r)
 for j in json.loads((P/(str(r['id'])+'-jobs.json')).read_text())['jobs']:
  if j['conclusion']!='failure':continue
  for suffix in ['', '/annotations']:
   try:
    req=urllib.request.Request(j['check_run_url']+suffix,headers={'User-Agent':'SE3110-read-only-audit','Accept':'application/vnd.github+json'})
    with urllib.request.urlopen(req,timeout=30) as res:o=json.load(res)
    (P/(str(j['id'])+('-annotations.json' if suffix else '-check.json'))).write_text(json.dumps(o,indent=2))
    if suffix:print(j['id'],str(o)[:2000])
   except Exception as e:print(j['id'],str(e))
(P/'focused-runs.json').write_text(json.dumps(selected,indent=2))
