# Individual contribution matrix

Assigned responsibility, recorded authorship and confirmed personal execution are distinct. Component counts exclude shared cases. Shared primary/support allocations are proposals, not invented effort or percentages. All final-audit source/config/report work is AI-assisted.

| Member | Component cases PASS / FAIL / BLOCKED | Responsibility | Personal execution |
|---|---|---|---|
| Jeyashankar | 7 / 4 / 2 | Lawyer management, specializations, legal services, recommendations and workforce | Pending member confirmation |
| Buddhika | 9 / 2 / 1 | Appointments, availability, scheduling, careers and scheduling AI | Pending member confirmation |
| Vithusan | 8 / 2 / 2 | Documentation requests, uploads, clerks and document verification | Pending member confirmation |
| Wijayananda | 8 / 0 / 4 | Authentication, JWT/RBAC, service requests, consultation and security | Pending member confirmation |

Original author strings preserved: b082f54 Jeyamdev; d461a84 yhprasad; a566efa VTN02;43f6345 Wishwa. Mapping accounts to students and personal effort requires member confirmation. C1 PR30/54aecccc is a merge record, not test execution ownership.

C3 six formerly failed cases: C3-02/03/05/06 now PASS on accepted current upload/size/checklist/update contracts; C3-01 service identity and C3-04 approval endpoint/state remain FAIL pending decisions. Historical failures are retained. Spoofed-PDF fix/retests from earlier phase are preserved; no new upload defect fix is claimed.

C4 historical C4-04/05/08 remain BLOCKED for generated refusal/disclaimer and expert legal-relevance criteria; C4-12 adds the fourth full component blocker. Scoped sanitizer/RRF/retrieval passes are not universal AI acceptance.

## Jeyashankar

Component IDs: TC-C101, TC-C102, TC-C103, TC-C104, TC-C105, TC-C106, TC-C107, TC-C108, TC-C109, TC-C110, TC-C111, TC-C112, TC-C113

Shared primary proposal: TC-BK-03, TC-BK-06, TC-FE-01, TC-FE-05, TC-MOB-01, TC-MOB-02

Original commit: {'sha': 'b082f54790a0ea5f99db9b31df532d56433319c5', 'recorded_author': 'Jeyamdev', 'author_date': '2026-10-05T09:48:02+05:30', 'subject': 'feat(member1): integrate lawyer mobile, matching, and workforce refinements', 'url': 'https://github.com/Wishwa2002/Intelligent-legal-service/commit/b082f54'}

CI: Frontend/Backend/Mobile successes at54aecccc, recorded runs at this SHA are PR32 develop-to-main; PR30 is the merge commit subject, not the selected run trigger.

Sources: backend/LegalService.API/Controllers/LawyersController.cs, backend/LegalService.API/Controllers/LegalCatalogController.cs, backend/LegalService.API/Services/Workforce/WorkforceAnalysisService.cs, ai-service/lawyer_recommendation/app.py

Reproduction: `dotnet test backend/LegalService.Tests/LegalService.Tests.csproj --filter FullyQualifiedName~LawyerManagementHttpTests --logger "trx;LogFileName=c1-member-reproduction.trx" --results-directory qmse-output/member-reproduction`

Clone published SHA; apply hashed historical-resolution and final-audit source overlays; .NET8 and cached/restored dependencies. Chosen demonstration filters run isolated fixtures; full PostgreSQL reproduction needs a fresh loopback maintenance cluster and guarded variables. See reproduction.md.

Screenshots: frontDesk-1280 / published member1-lawyer-development; existing lawyer/workforce figures

## Buddhika

Component IDs: TC-C2-01, TC-C2-02, TC-C2-03, TC-C2-04, TC-C2-05, TC-C2-06, TC-C2-07, TC-C2-08, TC-C2-09, TC-C2-10, TC-C2-11, TC-C2-12

Shared primary proposal: TC-BK-02, TC-BK-07, TC-DB-02, TC-FE-02, TC-MOB-04, TC-E2E-01, TC-E2E-07

Original commit: {'sha': 'd461a8407971eeb7e2349f6ccf5cb8f6150a22be', 'recorded_author': 'yhprasad', 'author_date': '2026-09-23T02:32:18+05:30', 'subject': 'feat(appointments): implement booking APIs, conflict detection, and status transitions', 'url': 'https://github.com/Wishwa2002/Intelligent-legal-service/commit/d461a84'}

CI: Historical8a9b8a24 shared CI succeeds. fb471202 PR33/34 failure authored yhprasad is excluded from tested baseline; identity mapping needs confirmation.

Sources: backend/LegalService.API/Controllers/AppointmentsController.cs, backend/LegalService.API/Services/AppointmentService.cs, backend/LegalService.API/Controllers/CareersController.cs, ai-service/app/agents/scheduling/classifier.py

Reproduction: `dotnet test backend/LegalService.Tests/LegalService.Tests.csproj --filter FullyQualifiedName~QmseAppointmentTests --logger "trx;LogFileName=c2-member-reproduction.trx" --results-directory qmse-output/member-reproduction`

Clone published SHA; apply hashed historical-resolution and final-audit source overlays; .NET8 and cached/restored dependencies. Chosen demonstration filters run isolated fixtures; full PostgreSQL reproduction needs a fresh loopback maintenance cluster and guarded variables. See reproduction.md.

Screenshots: Figures6.33/6.34 booking UI and real career; existing scheduling/timezone captures

## Vithusan

Component IDs: TC-C3-01, TC-C3-02, TC-C3-03, TC-C3-04, TC-C3-05, TC-C3-06, TC-C3-07, TC-C3-08, TC-C3-09, TC-C3-10, TC-C3-11, TC-C3-12

Shared primary proposal: TC-DB-01, TC-DB-03, TC-DB-04, TC-E2E-02, TC-E2E-03, TC-E2E-04, TC-E2E-05, TC-E2E-06

Original commit: {'sha': 'a566efa7951fa06505fe4c943014826f3b796170', 'recorded_author': 'VTN02', 'author_date': '2026-09-11T17:58:17+05:30', 'subject': 'feat(document-clerk): implement Agentic AI document validation, mobile client, and clerk management', 'url': 'https://github.com/Wishwa2002/Intelligent-legal-service/commit/a566efa'}

CI: Historical shared backend/frontend/mobile successes; no selected member-specific VTN02 workflow attribution is established.

Sources: backend/LegalService.API/Controllers/DocumentAndClerk/DocumentationRequestsController.cs, backend/LegalService.API/Services/DocumentAndClerk/DocumentFileService.cs, backend/LegalService.API/Controllers/DocumentAndClerk/ClerksController.cs, ai-service/app/agents/completeness.py

Reproduction: `dotnet test backend/LegalService.Tests/LegalService.Tests.csproj --filter FullyQualifiedName~QmseUploadRegressionTests --logger "trx;LogFileName=c3-member-reproduction.trx" --results-directory qmse-output/member-reproduction`

Clone published SHA; apply hashed historical-resolution and final-audit source overlays; .NET8 and cached/restored dependencies. Chosen demonstration filters run isolated fixtures; full PostgreSQL reproduction needs a fresh loopback maintenance cluster and guarded variables. See reproduction.md.

Screenshots: Figures6.35/6.36 actual Flutter catalogue/clerk review; spoofed PDF failure/retest and upload validation figures

## Wijayananda

Component IDs: TC-C4-01, TC-C4-02, TC-C4-03, TC-C4-04, TC-C4-05, TC-C4-06, TC-C4-07, TC-C4-08, TC-C4-09, TC-C4-10, TC-C4-11, TC-C4-12

Shared primary proposal: TC-BK-01, TC-BK-04, TC-BK-05, TC-FE-03, TC-FE-04, TC-MOB-03, TC-MOB-05

Original commit: {'sha': '43f6345d8cdd3158e5ecf51d124dcfab869261c9', 'recorded_author': 'Wishwa', 'author_date': '2026-09-22T19:41:53+05:30', 'subject': 'Implement JWT authentication and admin authorization', 'url': 'https://github.com/Wishwa2002/Intelligent-legal-service/commit/43f6345'}

CI: Shared historical CI only; exact published testing SHA has no runs. PR32 actorWishwa2002 is not personal test execution.

Sources: backend/LegalService.API/Authentication/Services/JwtService.cs, backend/LegalService.API/Authentication/Services/PasswordService.cs, backend/LegalService.API/Controllers/ServiceRequestsController.cs, ai-service/app/retrieval/hybrid_service.py

Reproduction: `dotnet test backend/LegalService.Tests/LegalService.Tests.csproj --filter FullyQualifiedName~Qmse_TC_C4_09 --logger "trx;LogFileName=c4-member-reproduction.trx" --results-directory qmse-output/member-reproduction`

Clone published SHA; apply hashed historical-resolution and final-audit source overlays; .NET8 and cached/restored dependencies. Chosen demonstration filters run isolated fixtures; full PostgreSQL reproduction needs a fresh loopback maintenance cluster and guarded variables. See reproduction.md.

Screenshots: Existing JWT/security/ZAP and member4-authentication captures; C4 retrieval diagnostics qualified

## Consolidated local technical evidence

Latest77-case counts are unchanged at49PASS/16FAIL/12BLOCKED. New proposals are disabled pending group approval; passing proposaltests do not resolve historicalexpectations. Developmentfilesystemcleanup and missingnosniff were fixed locally;3AIdependency patches passed114deterministictests. Latestbackend365tests362PASS1FAIL2SKIP;Flutter60PASS;baselinePlaywright111PASS3SKIP. Twelve historicalCIlogarchives are nowavailable, but no finaloverlayCIrun exists. All fixes/tests areAI-assisted; personalexecution remainsPending memberconfirmation.

- Jeyashankar: Existing query boundaries verified; optional headroom proposal disabled; current responsibility not authorship.
- Buddhika: Optional cancellation notice tested/default disabled; Flutter canCancel capability fix with60passing suite.
- Vithusan: Confirmed development orphan cleanup fixed/realPostgres retested; proposed atomicservicebatch disabled/noHTTProute.
- Wijayananda: Nosniff header fixed/passive retested; credential incident/three dependency patches;114deterministicAItests do not prove live acceptance.
