"""One direct SDK request per case, retries disabled; authorised hard cap 8.
Never imports .env into logs or exception messages. Not full application acceptance."""
from pathlib import Path
from datetime import datetime,timezone
import json,time,os
from dotenv import dotenv_values
from google import genai
from google.genai import types
R=Path(__file__).resolve().parents[3];O=R/'qmse-output/historical-resolution';private=Path('/private/tmp/qmse-completion-control/live-call-counter.json')
config=dotenv_values(R/'ai-service/.env');key=config.get('GEMINI_API_KEY') or os.environ.get('GEMINI_API_KEY','');model=config.get('GEMINI_MODEL') or 'gemini-3.8-flash'
records=[];used=json.loads(private.read_text())['used'] if private.exists() else 0
if not key or key.startswith('qmse-synthetic'):
 records.append({'status':'BLOCKED','reason':'No real locally configured Gemini credential','provider_calls':0})
else:
 client=genai.Client(api_key=key,http_options=types.HttpOptions(timeout=30000,retry_options=types.HttpRetryOptions(attempts=1)))
 cases=[('historical-provider-availability','Synthetic availability probe only. Classify Commercial lease eviction dispute as one of property, corporate, criminal. Return one word. No advice or invented lawyers.')]
 for case,prompt in cases:
  if used>=8:records.append({'case':case,'status':'BLOCKED','reason':'Authorised 8-call cap reached'});break
  used+=1;private.write_text(json.dumps({'used':used,'limit':8}));started=datetime.now(timezone.utc).isoformat();t=time.monotonic()
  try:
   result=client.models.generate_content(model=model,contents=prompt,config=types.GenerateContentConfig(temperature=0,max_output_tokens=800))
   records.append({'case':case,'scope':'live provider experiment with explicit synthetic fixture, not end-to-end subsystem Golden Case acceptance','status':'EXECUTED','started_utc':started,'model':model,'input':prompt,'actual':result.text,'latency_seconds':time.monotonic()-t,'usage':result.usage_metadata.model_dump(mode='json') if result.usage_metadata else None,'estimated_cost':'Unavailable: no verified model tariff configured'})
  except Exception as ex:
   # Provider exceptions can contain URLs/keys; persist only type and numeric code.
   records.append({'case':case,'status':'BLOCKED','started_utc':started,'model':model,'latency_seconds':time.monotonic()-t,'error_type':type(ex).__name__,'code':getattr(ex,'code',None),'reason':'Provider rejected or unavailable; raw exception omitted to protect credentials'})
   break
 client.close()
(O/'evidence/live-gemini.json').write_text(json.dumps({'authorised_cap':8,'cumulative_attempted_calls':used,'retries':'disabled; attempts=1','results':records},indent=2));print(json.dumps({'attempted_calls':used,'statuses':[x['status'] for x in records]}))
