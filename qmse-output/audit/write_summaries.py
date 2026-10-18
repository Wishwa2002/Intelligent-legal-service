from pathlib import Path
import json,collections
R=Path(__file__).resolve().parents[2];O=R/'qmse-output';s=json.load(open(O/'test-results/summary.json'));mobile=json.load(open(O/'test-results/mobile-minimal.json'));s['mobile']={'status':'VERIFIED','total':49,'passed':49,'failed':0,'skipped':0,'suite_files':6,'test_duration_seconds':9.115,'scope':'Flutter unit/widget tests; recovered official SDK sources/resources and matching cached test artifacts; no physical device or integrated live API','execution':mobile};(O/'test-results/summary.json').write_text(json.dumps(s,indent=2))
k=json.load(open(O/'evidence/performance/k6-summary.json'));m=k['metrics'];run=json.load(open(O/'test-results/performance-final.json'))
rows=[]
for label,name in [('Lawyer search','lawyer_search_ms'),('Lawyer details','lawyer_detail_ms'),('Appointment list','appointment_list_ms'),('Mock AI gateway','mock_ai_gateway_ms')]:
 v=m[name]['values'];rows.append(f"| {label} | {v['p(50)']:.3f} | {v['p(95)']:.3f} | {v['avg']:.3f} |")
text=f'''# Performance testing report

k6 2.3.0; 2 VUs; nominal duration 10 seconds; {m['iterations']['values']['count']} completed iterations; {m['http_reqs']['values']['count']} requests including setup; measured aggregate throughput {m['http_reqs']['values']['rate']:.3f} requests/second; HTTP error rate {m['http_req_failed']['values']['rate']:.1%}. Execution start: {run['started_utc']}; tool exit code: {run['exit_code']}.

Target was the isolated loopback ASP.NET fixture recorded in security/scan-metadata.json. Actual controllers/services run on Kestrel; database is EF InMemory with a small synthetic catalogue; AI gateway uses a mocked HttpMessageHandler. This is a local smoke benchmark, not hosted load acceptance.

| Endpoint / scope | p50 ms | p95 ms | Average ms |
|---|---:|---:|---:|
{chr(10).join(rows)}

API fixture p95 values are below NFR-01's 200 ms target. This demonstrates the sampled minimal workload only. No production-like PostgreSQL query time, network/hosting latency, saturated load, POST appointment transaction throughput, login hashing latency or live Gemini latency was measured. The mock AI gateway result cannot be compared as proof of live-AI response below 1.5 seconds. Live-AI NFR acceptance remains BLOCKED.

The initial script setup expected a paginated response without requesting page parameters. It aborted with exit 107 before load; retained in performance.log/performance.json. The corrected script requests page=1&pageSize=10. Final artifacts: k6-summary.json, k6-raw-final.json and test-results/performance-final.log/.json. No application logic was changed for the benchmark. No external AI charge or public target was involved.

Reproduction: start the opt-in Qmse_LocalEvidenceHost test with QMSE_START_EVIDENCE_HOST=1 and QMSE_HOST_CONTROL=/private/tmp/qmse-host; run local-smoke.k6.js with k6 from the repository root. The temporary ready.json contains only the synthetic fixture token and URL and is deliberately excluded from deliverables. The script refuses a non-loopback URL. Reinstall k6 or adjust its local binary path when replaying.
'''
(O/'evidence/performance/performance-report.md').write_text(text)
lines=['# Test execution summary','',f"Base commit: {json.load(open(O/'audit/snapshot.json'))['commit']}. All timestamps below are actual execution timestamps, stored in UTC. Display date in report: 8 October 2026, Asia/Colombo.",'','| Suite | Total | Passed | Failed | Skipped | Exit | Start UTC | Wall seconds |','|---|---:|---:|---:|---:|---:|---|---:|']
for key in ['backend','frontend_node','playwright','ai','mobile']:
 x=s[key];e=x['execution'];lines.append(f"| {key} | {x['total']} | {x['passed']} | {x['failed']} | {x['skipped']} | {e['exit_code']} | {e['started_utc']} | {e['duration_seconds']} |")
lines+=['',f"Flutter: 49 unit/widget tests passed across 6 files; actual test event duration 9.115 seconds, runner wall time includes SDK/lock setup. Official source/resource recovery and matching cached artifacts enabled execution. Earlier failed/timeout setup attempts are retained; no physical-device or complete API workflow result is inferred.",'','Backend total includes one skipped evidence-host harness plus one skipped live AI transport case. Functional denominator excludes the host harness. Counts across tools are not report-case totals and are not unique business requirements.',f"Backend aggregate Coverlet line coverage: {s['backend']['coverage_line_rate']:.2%}; branch coverage: {s['backend']['coverage_branch_rate']:.2%}. This includes the referenced API assembly, unexecuted startup and other code; it is not individual ownership coverage.",'','The final one xUnit failure reproduces spoofed PDF acceptance. Initial Python run: 86 passed/2 failed due provider initialization without a key. Final synthetic-initialization run: 98 deterministic/mocked cases passed; original failures remain in ai.log and pytest.xml. Initial sandbox failures were test-runner/server socket blockers, not successful executions.','', 'Mapped original report cases: 77 designed; 14 VERIFIED, 4 FAILED (3 requirement conflicts + spoofed upload), 2 BLOCKED, 57 HISTORICAL/UNVERIFIED. Detailed record: case-verification.json. No historical timing or GC accuracy is promoted to a fresh measurement.','', 'Security: passive ZAP, 4 alert instances (3 Low missing-header alerts; 1 Informational authentication-discovery alert). Performance: local InMemory/mock benchmark only. Integrated mobile-to-clerk workflow, live Golden Cases and live-AI latency remain BLOCKED.']
(O/'test-results/test-execution-summary.md').write_text('\n'.join(lines)+'\n')
