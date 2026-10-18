import http from 'k6/http';import {check,sleep} from 'k6';import {Trend} from 'k6/metrics';
const f=JSON.parse(open('/private/tmp/qmse-completion-control/performance.json'));
if(f.baseUrl!=='http://127.0.0.1:55443')throw Error('Isolated loopback only');
const trends={search:new Trend('lawyer_search_ms',true),details:new Trend('lawyer_details_ms',true),appointments:new Trend('appointments_ms',true),documents:new Trend('documentation_ms',true)};
export const options={vus:2,duration:'15s',summaryTrendStats:['avg','med','p(50)','p(95)','min','max'],thresholds:{http_req_failed:['rate<0.01'],lawyer_search_ms:['p(95)<200'],lawyer_details_ms:['p(95)<200'],appointments_ms:['p(95)<200'],documentation_ms:['p(95)<200']}};
export default function(){for(const [name,endpoint] of [['search','/api/lawyers/search?page=1&pageSize=10'],['details',`/api/lawyers/${f.lawyerId}`],['appointments','/api/appointments'],['documents','/api/documentation-requests']]){const r=http.get(f.baseUrl+endpoint,{headers:{Authorization:'Bearer '+f.token},tags:{endpoint:name}});trends[name].add(r.timings.duration);check(r,{[name+' HTTP 200']:r=>r.status===200});}sleep(1);}
export function handleSummary(data){return {'qmse-output/completion-20261008/evidence/k6-postgres-summary.json':JSON.stringify(data,null,2)};}
