# Member viva guide

Commands run from a fresh checked-out/overlay repository. Keep new logs separate; never rerun shared seeders against production. Each student must personally run and understand the test.

## Jeyashankar

Clone published SHA; apply hashed historical-resolution and final-audit source overlays; .NET8 and cached/restored dependencies. Chosen demonstration filters run isolated fixtures; full PostgreSQL reproduction needs a fresh loopback maintenance cluster and guarded variables. See reproduction.md.

```sh
dotnet test backend/LegalService.Tests/LegalService.Tests.csproj --filter FullyQualifiedName~LawyerManagementHttpTests --logger "trx;LogFileName=c1-member-reproduction.trx" --results-directory qmse-output/member-reproduction
```

Expected: Selected existing tests pass in the recorded full relational regression; inspect native TRX, not only process exit. No personal execution claimed.

Recorded source: final-audit/debug/evidence/regression-backend-postgres.trx; supporting before/after cases in accepted-replacements.json and original failure logs.

Failure/retest explanation: Explain unsupported specializationId versus accepted specialization and preserved three-lawyer actual API result; fee/query/headroom rules not fixed.

Q: Why did query boundary fail?
A: Current3–4000 conflicts with historical10–1000; approval pending.

Q: Are scores live Gemini accuracy?
A: No; deterministic ranking/schema checks and unavailable provider are distinguished.

Q: Does assignment prove authorship?
A: No; Git metadata and personal execution confirmation are separate.

## Buddhika

Clone published SHA; apply hashed historical-resolution and final-audit source overlays; .NET8 and cached/restored dependencies. Chosen demonstration filters run isolated fixtures; full PostgreSQL reproduction needs a fresh loopback maintenance cluster and guarded variables. See reproduction.md.

```sh
dotnet test backend/LegalService.Tests/LegalService.Tests.csproj --filter FullyQualifiedName~QmseAppointmentTests --logger "trx;LogFileName=c2-member-reproduction.trx" --results-directory qmse-output/member-reproduction
```

Expected: Selected existing tests pass in the recorded full relational regression; inspect native TRX, not only process exit. No personal execution claimed.

Recorded source: final-audit/debug/evidence/regression-backend-postgres.trx; supporting before/after cases in accepted-replacements.json and original failure logs.

Failure/retest explanation: Explain historical PUT405 versus actual POST200/Cancelled and PostgreSQL slot release.

Q: Why change PUT cancel to POST?
A: The explicitly accepted current controller contract uses POST; original405 evidence remains.

Q: Was24-hour rejection fixed?
A: No; V3/current rule conflict awaits approval.

Q: What proves no double booking?
A: Actual EF/PostgreSQL unique constraint23505 retained one booking; service mock alone cannot prove DB atomicity.

## Vithusan

Clone published SHA; apply hashed historical-resolution and final-audit source overlays; .NET8 and cached/restored dependencies. Chosen demonstration filters run isolated fixtures; full PostgreSQL reproduction needs a fresh loopback maintenance cluster and guarded variables. See reproduction.md.

```sh
dotnet test backend/LegalService.Tests/LegalService.Tests.csproj --filter FullyQualifiedName~QmseUploadRegressionTests --logger "trx;LogFileName=c3-member-reproduction.trx" --results-directory qmse-output/member-reproduction
```

Expected: Selected existing tests pass in the recorded full relational regression; inspect native TRX, not only process exit. No personal execution claimed.

Recorded source: final-audit/debug/evidence/regression-backend-postgres.trx; supporting before/after cases in accepted-replacements.json and original failure logs.

Failure/retest explanation: Explain genuine spoofed-PDF failure, signature/parser fix and earlier regression; then current upload201/link and14MiB400/no-mutation controls.

Q: Why does2MiB upload return201?
A: Current per-request route creates a file resource; DB linkage is verified.

Q: Why change completeness50 to75?
A: Accepted fixture has four requirements and three supplied; this is coverage arithmetic, not AI accuracy.

Q: Does rollback prove atomic three-file HTTP workflow?
A: No; per-attachment/caller transactions pass, multi-request boundary still needs approval.

## Wijayananda

Clone published SHA; apply hashed historical-resolution and final-audit source overlays; .NET8 and cached/restored dependencies. Chosen demonstration filters run isolated fixtures; full PostgreSQL reproduction needs a fresh loopback maintenance cluster and guarded variables. See reproduction.md.

```sh
dotnet test backend/LegalService.Tests/LegalService.Tests.csproj --filter FullyQualifiedName~Qmse_TC_C4_09 --logger "trx;LogFileName=c4-member-reproduction.trx" --results-directory qmse-output/member-reproduction
```

Expected: Selected existing tests pass in the recorded full relational regression; inspect native TRX, not only process exit. No personal execution claimed.

Recorded source: final-audit/debug/evidence/regression-backend-postgres.trx; supporting before/after cases in accepted-replacements.json and original failure logs.

Failure/retest explanation: Explain authentication rejection of missing/invalid/expired/tampered JWT, and historical raw-corpus disclaimer diagnostic corrected to retrieval contract without completing generated disclaimer acceptance.

Q: Why do backend regressions still fail?
A: BCrypt cost11 differs from historical12; strengthening rule approval is pending.

Q: Does JWT URIclaim difference break RBAC?
A: Recorded role restrictions work; exact wireclaim contract remains separate.

Q: Why is raw retrieval not disclaimer evidence?
A: It returns source documents, not generated advice; full disclaimer/relevance acceptance is blocked.

## Consolidated local technical evidence

Latest77-case counts are unchanged at49PASS/16FAIL/12BLOCKED. New proposals are disabled pending group approval; passing proposaltests do not resolve historicalexpectations. Developmentfilesystemcleanup and missingnosniff were fixed locally;3AIdependency patches passed114deterministictests. Latestbackend365tests362PASS1FAIL2SKIP;Flutter60PASS;baselinePlaywright111PASS3SKIP. Twelve historicalCIlogarchives are nowavailable, but no finaloverlayCIrun exists. All fixes/tests areAI-assisted; personalexecution remainsPending memberconfirmation.

- Jeyashankar: Existing query boundaries verified; optional headroom proposal disabled; current responsibility not authorship.
- Buddhika: Optional cancellation notice tested/default disabled; Flutter canCancel capability fix with60passing suite.
- Vithusan: Confirmed development orphan cleanup fixed/realPostgres retested; proposed atomicservicebatch disabled/noHTTProute.
- Wijayananda: Nosniff header fixed/passive retested; credential incident/three dependency patches;114deterministicAItests do not prove live acceptance.
