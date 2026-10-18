k6 2.3.0 actual PostgreSQL/API retest: 2 VUs, 15 s, 120 HTTP requests, error rate 0, throughput 7.803/s. Search p50/p95/avg 3.487/5.679/3.724 ms; details 2.134/3.528/2.277; appointments GET 1.500/3.585/1.694; documentation GET 15.475/20.966/15.831. Tiny synthetic read workload; not hosted/booking throughput acceptance. First failing run and raw JSON samples preserved.



Native k6 rate metric semantics: http_req_failed.values.rate=0; passes=0/fails=120 counts 120 false samples (successful HTTP outcomes), not 120 failed requests. Endpoint custom trends are measured milliseconds; raw samples and threshold outcomes are retained.
