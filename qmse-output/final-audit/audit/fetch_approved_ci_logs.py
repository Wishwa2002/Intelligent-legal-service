"""User-approved read-only GitHub log download. Credentials stay in memory."""
from pathlib import Path
import subprocess,json,urllib.request,urllib.error,urllib.parse,zipfile,io,datetime,hashlib,re
O=Path('qmse-output/final-audit/evidence/ci');runs=json.loads((O/'focused-runs.json').read_text());results=[]
raw=subprocess.run(['git','credential','fill'],input='protocol=https\nhost=github.com\n\n',text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,env={**__import__('os').environ,'GIT_TERMINAL_PROMPT':'0'},timeout=20)
cred=dict(line.split('=',1) for line in raw.stdout.splitlines() if '=' in line);token=cred.get('password');raw=None
if not token:
 (O/'approved-log-download.json').write_text(json.dumps({'approval':'Read-only credential use approved by user','outcome':'No existing GitHub credential returned; no credential values recorded'},indent=2));print('No existing GitHub credential returned');raise SystemExit(0)
redactions=[token]
# Never publish credential material or sensitive names from historical connection artifacts.
paths=subprocess.check_output(['git','ls-tree','-r','--name-only','origin/main'],text=True).splitlines()
for p in paths:
 if not re.search(r'connection|database|\.txt$|appsettings|\.env',p,re.I):continue
 text=subprocess.check_output(['git','show',f'origin/main:{p}']).decode('utf8','ignore')
 for m in re.finditer(r'(?:Password|pwd)\s*=\s*([^;\s\"\']+)|postgres(?:ql)?://[^:\s]+:([^@\s]+)@',text,re.I):
  v=m.group(1) or m.group(2)
  if len(v)>=6 and not re.search(r'placeholder|your_|password|example|changeme|\$\{|<|\{',v,re.I):redactions.extend([v,p])
class SafeRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,req,fp,code,msg,headers,newurl):
  u=urllib.parse.urlparse(newurl)
  if u.scheme!='https':raise ValueError('Unsafe redirect protocol')
  r=super().redirect_request(req,fp,code,msg,headers,newurl)
  if u.hostname!='api.github.com':r.remove_header('Authorization')
  return r
opener=urllib.request.build_opener(SafeRedirect())
for r in runs:
 rid=r['id'];url=f'https://api.github.com/repos/Wishwa2002/Intelligent-legal-service/actions/runs/{rid}/logs'
 try:
  with opener.open(urllib.request.Request(url,headers={'Authorization':'Bearer '+token,'User-Agent':'SE3110-approved-read-only-audit','Accept':'application/vnd.github+json'}),timeout=30) as response:data=response.read()
  original_hash=hashlib.sha256(data).hexdigest();count=0;changed=False;native=io.BytesIO()
  with zipfile.ZipFile(io.BytesIO(data)) as z,zipfile.ZipFile(native,'w',zipfile.ZIP_DEFLATED) as out:
   for name in z.namelist():
    if not name.endswith('.txt'):continue
    if '..' in Path(name).parts or Path(name).is_absolute():raise ValueError('Unsafe archive member')
    text=z.read(name).decode('utf8','replace');clean=text
    for value in redactions:clean=clean.replace(value,'[REDACTED-CREDENTIAL-MATERIAL]')
    changed|=clean!=text;f=O/'logs'/str(rid)/name;f.parent.mkdir(parents=True,exist_ok=True);f.write_text(clean);out.writestr(name,clean);count+=1
  (O/f'{rid}-native-logs.zip').write_bytes(native.getvalue());results.append({'run_id':rid,'workflow':r['name'],'sha':r['head_sha'],'status':'downloaded','files':count,'original_archive_sha256':original_hash,'credential_redaction_applied':changed,'archive':'qmse-output/final-audit/evidence/ci/'+str(rid)+'-native-logs.zip'})
 except Exception as e:results.append({'run_id':rid,'status':'blocked','error_type':type(e).__name__,'http_status':getattr(e,'code',None)})
(O/'approved-log-download.json').write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'approval':'User approved existing credential use solely for selected read-only CI logs','credential_retained':False,'attempts':results},indent=2));print(json.dumps({'downloaded':sum(r['status']=='downloaded' for r in results),'blocked':sum(r['status']=='blocked' for r in results)}))
