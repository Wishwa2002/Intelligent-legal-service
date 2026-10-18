# AI-assisted instrumentation only: real provider, bounded budget, no business-rule changes.
import sys,os,json,time,builtins,asyncio
from pathlib import Path
from datetime import datetime,timezone
sys.path.insert(0,str(Path.cwd()))
O=Path(__file__).resolve().parent
from google import genai
from google.genai import types
from lawyer_recommendation import gemini
state={'requests':[],'max_requests':3,'stopped_for_quota_or_billing':False}
def save(): (O/'provider-native.json').write_text(json.dumps(state,indent=2))
def clean(value):
 s=json.dumps(value)
 for k in ['GEMINI_API_KEY','GOOGLE_API_KEY','AI_INTERNAL_KEY']:
  v=os.getenv(k,'')
  if v:s=s.replace(v,'[REDACTED]')
 return json.loads(s)
async def before(request):
 if len(state['requests'])>=3 or state['stopped_for_quota_or_billing']:raise RuntimeError('Authorised live-call budget exhausted or quota gate closed')
 assert request.url.host=='generativelanguage.googleapis.com' and ':generateContent' in request.url.path
 body=json.loads(request.content);row={'sequence':len(state['requests'])+1,'started_utc':datetime.now(timezone.utc).isoformat(),'endpoint':str(request.url.copy_with(query=None)),'request_body':clean(body),'_clock':time.monotonic()}
 state['requests'].append(row);save()
async def after(response):
 body=await response.aread()
 try:data=json.loads(body)
 except ValueError:data={'non_json_response':True}
 row=state['requests'][-1];row['duration_seconds']=time.monotonic()-row.pop('_clock',time.monotonic());row['http_status']=response.status_code;row['response_body']=clean(data);row['ended_utc']=datetime.now(timezone.utc).isoformat()
 text=str(data).lower()
 if response.status_code==429 or (response.status_code>=400 and any(w in text for w in ['quota','billing','resource_exhausted'])):state['stopped_for_quota_or_billing']=True
 save()
original=genai.Client
def client(*args,**kwargs):
 opt=kwargs.get('http_options') or types.HttpOptions();opt.retry_options=types.HttpRetryOptions(attempts=1);opt.timeout=20000
 transport=opt.httpx_async_client
 if transport:
  transport.event_hooks['request'].append(before);transport.event_hooks['response'].append(after)
 kwargs['http_options']=opt
 return original(*args,**kwargs)
genai.Client=client
# Override only the classifier module's retry loop, leaving its prompt/schema/real SDK unchanged.
gemini.range=lambda n:builtins.range(1) if n==3 else builtins.range(n)
import uvicorn
save();uvicorn.run('lawyer_recommendation.app:app',host='127.0.0.1',port=55545,log_level='info')
