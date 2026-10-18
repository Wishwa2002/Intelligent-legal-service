# 15-minute targeted follow-up

BCrypt cost 12 is stated in the available V3 reference, but group approval remains unconfirmed. Application code and default cost 11 were retained. The original historical assertion was not changed. Added PasswordCurrentContractTests.cs with three AI-assisted regressions: cost-11 hashing/correct-versus-wrong verification, distinct salts and verification compatibility with stored cost-12 hashes. All three pass.

Focused run: 15 total; 14 PASS, 1 FAIL, 0 SKIPPED; exit 1. The sole failure is the preserved historical cost-12 assertion. Related JWT/RBAC, development-account safeguards and existing password regression pass. Native TRX/log and focused-results.json are retained here. The previous full-backend 365-case result and 77-case ledger remain unchanged; this run is a separate overlapping population.

Reproduce from repository root (local listener access required; synthetic/in-memory fixtures only):
```sh
dotnet test backend/LegalService.Tests/LegalService.Tests.csproj --no-restore --filter 'FullyQualifiedName~PasswordCurrentContractTests|FullyQualifiedName~TC_BK_01_PasswordHashAndVerification|FullyQualifiedName~Qmse_PasswordHashRejectsWrongPasswordAndReportsCost|FullyQualifiedName~Qmse_TC_C4_09|FullyQualifiedName~Qmse_TC_C4_11|FullyQualifiedName~DevelopmentAdminSeederTests' --logger 'trx;LogFileName=focused-authentication.trx' --results-directory qmse-output/reproduction/targeted-authentication
```

Credential rotation/revocation is UNCONFIRMED; owner-action-warning.md specifies the private confirmation required. Safe in-memory comparisons found no historical credential values or high-confidence token/private-key patterns in report text. Image evidence remains previously visually reviewed; OCR was unavailable. No secret value was logged or used for authentication.

Only affected execution conclusion, security note and report conclusion were updated, with two source-provenance cells qualified as prior overlay records. Report remains 101 pages and 43 figures; six changed page images checked, other pages hash-identical to prior review. TOC page references unchanged and verified. Earlier DOCX/PDF preserved under report-before/. Final PDF/DOCX exported to final-report/. No new screenshots, live AI calls, CI/dependency work, full-suite run, ZIP/overlay verification, Git commit/push or deployment. Manual actions: approve BCrypt policy and privately confirm historical credential revocation/rotation.
