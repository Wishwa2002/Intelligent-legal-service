# Requirements traceability before business-rule changes

Reference: SE3090_LegalEase_AI_Full_Report.docx, Version 3.0 consolidated specification; formal approval not independently established. SHA-256: cec4ed8c12efddaffe27619272e846eda51619472dcb76773800557e364d6163. SE3110 remains the authoritative assessment specification. Historical PASS/rollback claims within SE3090 are not fresh execution evidence.

| Case / area | Available requirement | Current implementation | Decision |
|---|---|---|---|
| TC-C107 | No explicit 10–1000 query limit located | requirement string 3–4000 in Pydantic and API validation | Test actual contract separately; retain original acceptance discrepancy pending approval |
| TC-C112 | FR-07 30-day analysis; Stage 6 narrative explicitly mentions below 20% headroom | Later workforce settings redesign uses configurable 0.75 WATCH and CONCERN thresholds plus human approval | Specification/version conflict: preserve configurable rules; do not silently mark historical threshold passed |
| TC-C2-09 | No 24-hour cancellation notice restriction found; 24h text concerns JWT expiration | Cancellation releases booked slot at 1439/1440/1441 minutes | Characterisation tests may pass; original rejected-before-24h acceptance remains unresolved |
| TC-C3-07 / DEF-12 | Section 14 MIME verification, 10MB ceiling, nonpublic storage; FR-12 multiple attachments | Previously trusted extension/MIME and accepted inert MZ bytes | Explicit user authorises content-validation fix; retain formats/size and add parser/signature verification before persistence |
| TC-C3-12 / NFR-03 | ACID, zero orphan records; Section 15 TC-DB-04 describes insert then failed attach within transaction | Request creation and individual uploads are separate requests; pending request is legitimate until later attachments | Verify real PostgreSQL transaction rollback and per-attachment no-mutation; do not invent atomic multi-file endpoint |
| TC-C4-12 | Report promises non-privilege disclaimer on every reply | No universal disclaimer schema/enforcement found in current AI service | Retain BLOCKED acceptance; bounded live experiments cannot establish all replies |
| GC-01–04 | Report examples/accuracy claims lack runnable datasets/denominators | Reproducible synthetic review dataset and actual deterministic subcriteria added | Distinguish subcriteria from live subsystem acceptance and historical percentages |
| Integrated workflow | SE3110 requires one full workflow across relevant real components | Fresh PostgreSQL, real API/React/Flutter web and actual FastAPI deterministic path | Record real results; do not substitute intercepted API responses or claim live Gemini when unused |
