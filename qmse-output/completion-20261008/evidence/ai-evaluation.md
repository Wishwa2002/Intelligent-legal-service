# AI evaluation

Dataset: ai-service/tests/qmse_golden_cases.json. Runner: test_qmse_golden_reproducible.py within the final 102-test pytest execution. Actual output records are in test-results/completion-20261008-ai.log and ai-completion.xml.

Three deterministic GC-03 fixtures compare exact missing-document/status outputs: incomplete NIC-only/survey subset, full checklist, and empty checklist. Three of three subcriteria pass, not a live accuracy percentage or original Golden Case certification. GC-04 sanitizer-wrapping characterization passes; the input remains in an isolation wrapper. This is not a safe refusal or privilege-disclaimer test. GC-01/02 expected fixtures are retained but full live evaluation was not executed successfully.

live-gemini.json records the single actual synthetic provider request: model gemini-3.8-flash, ServerError 504, 29.326 s to failure, no response/token metadata. Maximum eight authorised calls; one attempted, retries disabled; no additional calls. Estimated cost cannot be calculated without usage and a verified tariff. Provider errors are sanitized to avoid leaking credentials. Deterministic real FastAPI clerk ranking in the integrated workflow is separate from live Gemini.

