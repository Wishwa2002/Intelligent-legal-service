from pathlib import Path
import subprocess,re,json,hashlib,datetime
P=Path('qmse-output/final-audit');O=P/'security';O.mkdir(exist_ok=True)
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip();main=subprocess.check_output(['git','rev-parse','refs/remotes/origin/main'],text=True).strip()
paths=subprocess.check_output(['git','ls-tree','-r','--name-only',main],text=True).splitlines();findings=[]
# Inspect candidate connection/config text in memory only. Neither paths nor secrets are emitted.
for path in paths:
 if not re.search(r'connection|database|\.txt$|appsettings|\.env',path,re.I):continue
 b=subprocess.check_output(['git','show',f'{main}:{path}']);txt=b.decode('utf-8','ignore')
 matches=list(re.finditer(r'(?:Password|pwd)\s*=\s*([^;\s\"\']+)|postgres(?:ql)?://[^:\s]+:([^@\s]+)@',txt,re.I))
 for m in matches:
  value=m.group(1) or m.group(2)
  if len(value)<6 or re.search(r'placeholder|your_|password|example|changeme|\$\{|<|\{',value,re.I):continue
  if not re.search(r'neon|supabase|postgres|Host=|Server=',txt,re.I):continue
  commits=subprocess.check_output(['git','log','--format=%H|%aI|%an',main,'--',path],text=True).splitlines()
  findings.append({'artifact':'Historical database connection artifact (sensitive name/content withheld)','commit_metadata':commits[:4],'credential_type':'Non-placeholder PostgreSQL password with remote service connection details','appears_genuine':True,'service':'PostgreSQL/Neon' if 'neon' in txt.lower() else 'PostgreSQL','present_at_tested_head':subprocess.run(['git','cat-file','-e',f'{head}:{path}'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0,'current_exact_value_matches':[]})
  tracked=subprocess.check_output(['git','ls-files'],text=True).splitlines()
  for current in tracked:
   q=Path(current)
   if q.is_file() and value.encode() in q.read_bytes():findings[-1]['current_exact_value_matches'].append({'path':current})
# This is artifact evidence, not validation that the credential is valid today.
(O/'credential-finding.json').write_text(json.dumps({'checked_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'head':head,'original_main':main,'findings':findings,'limitations':'No authentication attempted; validity/rotation status unknown. Ignored local environment credentials not copied or published.'},indent=2))
print(json.dumps({'historical_findings':len(findings),'present_in_tested_tree':sum(x['present_at_tested_head'] for x in findings),'current_exact_matches':sum(len(x['current_exact_value_matches']) for x in findings)}))
