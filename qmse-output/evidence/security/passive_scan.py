"""Passive-only ZAP scan of a locally controlled QMSE fixture. No spider/active scan."""
import urllib.request,urllib.parse,http.client,json,pathlib,time,datetime
root=pathlib.Path(__file__).resolve().parents[3];out=root/'qmse-output/evidence/security'; fixture=json.load(open('/private/tmp/qmse-host/ready.json')); target=fixture['baseUrl'];assert target.startswith('http://127.0.0.1:')
api='http://127.0.0.1:55443';start=datetime.datetime.now(datetime.timezone.utc).isoformat()
def get(path,params=None):
 with urllib.request.urlopen(api+path+('?' +urllib.parse.urlencode(params) if params else ''),timeout=15) as r:return r.read()
version=json.loads(get('/JSON/core/view/version/'))['version']; records=[]
paths=[('GET','api/lawyers/search?page=1&pageSize=10',None,None),('GET','api/appointments',None,fixture['token']),('POST','api/lawyers',{},None),('POST','api/lawyers',{},'invalid.jwt.value'),('POST','api/auth/login',{'email':'nobody@example.test','password':'synthetic-wrong'},None),('GET','api/lawyers/search?search='+urllib.parse.quote("' OR 1=1--"),None,None)]
for method,path,body,token in paths:
 c=http.client.HTTPConnection('127.0.0.1',55443,timeout=20); headers={'Content-Type':'application/json'}
 if token:headers['Authorization']='Bearer '+token
 c.request(method,target+path,json.dumps(body) if body is not None else None,headers);r=c.getresponse();data=r.read(); records.append({'method':method,'path':path,'status':r.status,'response_length':len(data),'headers':dict(r.getheaders())});c.close()
for _ in range(30):
 pending=int(json.loads(get('/JSON/pscan/view/recordsToScan/'))['recordsToScan'])
 if pending==0:break
 time.sleep(1)
alerts=json.loads(get('/JSON/core/view/alerts/',{'baseurl':target,'start':0,'count':1000}));(out/'zap-alerts.json').write_text(json.dumps(alerts,indent=2));(out/'zap-passive-report.html').write_bytes(get('/OTHER/core/other/htmlreport/'));(out/'zap-passive-report.xml').write_bytes(get('/OTHER/core/other/xmlreport/'));result={'scan_type':'passive only; six deliberate local requests; no spider or active scan','tool':'OWASP ZAP','version':version,'target':target,'started_utc':start,'ended_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'isolated actual ASP.NET controllers; EF InMemory; synthetic users; mocked AI; loopback HTTP','requests':records,'pending_records':pending,'alerts_count':len(alerts.get('alerts',[]))};(out/'scan-metadata.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
