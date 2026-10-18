# Performance testing report

k6 2.3.0; 2 VUs; nominal duration 10 seconds; 20 completed iterations; 81 requests including setup; measured aggregate throughput 7.823 requests/second; HTTP error rate 0.0%. Execution start: 2026-10-08T02:52:15.240917+00:00; tool exit code: 0.

Target was the isolated loopback ASP.NET fixture recorded in security/scan-metadata.json. Actual controllers/services run on Kestrel; database is EF InMemory with a small synthetic catalogue; AI gateway uses a mocked HttpMessageHandler. This is a local smoke benchmark, not hosted load acceptance.

| Endpoint / scope | p50 ms | p95 ms | Average ms |
|---|---:|---:|---:|
| Lawyer search | 2.998 | 16.876 | 4.605 |
| Lawyer details | 1.732 | 35.318 | 5.034 |
| Appointment list | 1.263 | 23.507 | 3.473 |
| Mock AI gateway | 4.274 | 88.110 | 16.937 |

API fixture p95 values are below NFR-01's 200 ms target. This demonstrates the sampled minimal workload only. No production-like PostgreSQL query time, network/hosting latency, saturated load, POST appointment transaction throughput, login hashing latency or live Gemini latency was measured. The mock AI gateway result cannot be compared as proof of live-AI response below 1.5 seconds. Live-AI NFR acceptance remains BLOCKED.

The initial script setup expected a paginated response without requesting page parameters. It aborted with exit 107 before load; retained in performance.log/performance.json. The corrected script requests page=1&pageSize=10. Final artifacts: k6-summary.json, k6-raw-final.json and test-results/performance-final.log/.json. No application logic was changed for the benchmark. No external AI charge or public target was involved.

Reproduction: start the opt-in Qmse_LocalEvidenceHost test with QMSE_START_EVIDENCE_HOST=1 and QMSE_HOST_CONTROL=/private/tmp/qmse-host; run local-smoke.k6.js with k6 from the repository root. The temporary ready.json contains only the synthetic fixture token and URL and is deliberately excluded from deliverables. The script refuses a non-loopback URL. Reinstall k6 or adjust its local binary path when replaying.
