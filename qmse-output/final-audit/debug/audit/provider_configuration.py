from pathlib import Path
import json,re,datetime
P=Path('qmse-output/final-audit');flags=[]
for f in [Path('ai-service/.env'),Path('backend/LegalService.API/.env'),Path('.env')]:
 vals={}
 if f.exists():
  for l in f.read_text().splitlines():
   if '=' in l and not l.lstrip().startswith('#'):
    k,v=l.split('=',1);k=k.strip()
    if k in ['GEMINI_API_KEY','GOOGLE_API_KEY','GEMINI_MODEL']:vals[k]=v.strip().strip('"\'')
 flags.append({'file':str(f),'exists':f.exists(),'key_presence':{k:bool(vals.get(k)) for k in ['GEMINI_API_KEY','GOOGLE_API_KEY']},'model':vals.get('GEMINI_MODEL') if re.fullmatch(r'gemini-[A-Za-z0-9._-]+',vals.get('GEMINI_MODEL','')) else None})
(P/'evidence/provider-configuration.json').write_text(json.dumps({'inspected_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'configuration':flags,'default_model':'gemini-3.8-flash','provider_calls_this_phase':0,'cumulative_prior_calls':2,'prior_error':503,'prior_error_detail_limitation':'Raw earlier exception deliberately omitted; exact overload/auth/model cause cannot be recovered from redacted code alone.','credential_values_in_output':False},indent=2));print('Configuration presence/model recorded without credential values; no provider requests.')
