import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';
const fixture=JSON.parse(open('/private/tmp/qmse-host/ready.json'));
if(!/^http:\/\/127\.0\.0\.1:\d+\/$/.test(fixture.baseUrl)) throw new Error('Only isolated loopback hosts are permitted');
const search=new Trend('lawyer_search_ms',true), detail=new Trend('lawyer_detail_ms',true), appointments=new Trend('appointment_list_ms',true), ai=new Trend('mock_ai_gateway_ms',true), errors=new Rate('qmse_error_rate');
export const options={vus:2,duration:'10s',summaryTrendStats:['avg','med','p(50)','p(95)','min','max'],thresholds:{lawyer_search_ms:['p(95)<200'],lawyer_detail_ms:['p(95)<200'],appointment_list_ms:['p(95)<200']}};
const headers={Authorization:`Bearer ${fixture.token}`,'Content-Type':'application/json'};
export function setup(){const r=http.get(fixture.baseUrl+'api/lawyers/search?page=1&pageSize=10',{headers}); return {id:r.json().items[0].lawyerId};}
export default function(data){
 const paths=[['search','api/lawyers/search?page=1&pageSize=10&search=Original',search],['detail',`api/lawyers/${data.id}`,detail],['appointments','api/appointments',appointments]];
 for(const [name,path,trend] of paths){const r=http.get(fixture.baseUrl+path,{headers,tags:{endpoint:name}});trend.add(r.timings.duration);errors.add(r.status!==200);check(r,{[name+' returns 200']:r=>r.status===200});}
 // Fixture uses an HttpMessageHandler; this measures .NET/mock transport only, no Gemini call.
 const r=http.post(fixture.baseUrl+'api/lawyer-recommendations',JSON.stringify({clientId:42,requirement:'Property dispute',limit:5}),{headers,tags:{endpoint:'mock-ai'}});ai.add(r.timings.duration);errors.add(r.status!==200);check(r,{'mock gateway returns 200':r=>r.status===200});sleep(1);
}
export function handleSummary(data){return {'qmse-output/evidence/performance/k6-summary.json':JSON.stringify(data,null,2)};}
