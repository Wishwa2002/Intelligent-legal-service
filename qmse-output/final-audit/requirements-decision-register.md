# Requirements decision register

Existing implemented contracts, historical expectations, technical defects and proposed rules are distinct. No prior business-rule approval is invented. All work is local and AI-assisted.

## TC-C107

- **historical:** 10–1,000 characters
- **existing:** 3–4,000 raw characters; at least three non-padding characters; API/Pydantic/React max consistent
- **spec:** V3 no explicit10–1000 requirement; persisted workflow max4000; existing DTO and React textarea
- **root:** Historical expectation differs from implemented validated contract; hook lacked explicit upper guard
- **rule:** EXISTING IMPLEMENTED CONTRACT retained. Add explicit client hook guard; no arbitrary10–1000 restriction.
- **reason:** Maintains compatibility with database/AI and existing form; whitespace is trimmed for submitted content. Chromium caps entered text at4000.
- **changes:** frontend/src/hooks/useRecommendationWorkflow.ts
- **tests:** RequirementsDecisionTests.ExistingRecommendationLengthContract (8); requirements-boundaries.spec.ts (8); existing AI8-boundary tests
- **results:** API DTO8PASS; actual browser8PASS after correcting fixture routing and maxlength-truncation assertion; full AI114PASS and baselineReact111PASS/3SKIP
- **approval:** Historical requirement decision pending; existing contract accepted for replacement tests; historical TC-C107 remainsFAIL

## TC-C112

- **historical:** 20% headroom boundary; some older descriptions sayWATCH below20%
- **existing:** Configurable WatchCapacityRatio default0.75; demand=max(requests,appointments); thirty-day windows; no forced hiring
- **spec:** FR07 thirty-day case influx/recruitment; V3 Stage6 says headroom<20%, no independently confirmed approval
- **root:** Different capacity heuristics and undefined exact-boundary convention
- **rule:** PROPOSED NEW RULE: optional WATCH at headroom<=20% (demand>=80% of available slots); retain concern>=100%, minimum-lawyer/minimum-slot/significant-demand gates. Formula H=(slots-max(requests,appointments))/slots for slots>0. Zero capacity follows existing no-capacity branches.
- **reason:** Conservative inclusive warning boundary; avoids duplicate demand and division by zero. Existing UI displays returnedWATCH label; no forced recruitment.
- **changes:** WorkforceAnalysisService.cs; Workforce:ProposedHeadroomEnabled=false default; ProposedMinimumHeadroom=0.20 validated(0,1)
- **tests:** RequirementsDecisionTests.ProposedHeadroomUsesExactBoundaryAndAvoidsDoubleCounting (79,80,81,99,100); WorkforceProposalIsDisabledByDefault; existing planning/hiring tests
- **results:** All6 new assessment/default testsPASS; full backend365cases362PASS1FAIL2SKIP
- **approval:** PROPOSED — PENDING GROUP APPROVAL; disabled default; historical TC-C112 remainsFAIL; group decides inclusive versus strict20% boundary

## TC-C2-09

- **historical:** Reject cancellation within24h
- **existing:** Cancel any nonCompleted/nonCancelled appointment without notice threshold
- **spec:** V3 Component2 endpoint table explicitly mentions24h notice; formalapproval/precedence unresolved. Earlier incomplete “none” search corrected.
- **root:** No implemented notice rule; clients did not uniformly usecanCancel
- **rule:** PROPOSED NEW RULE: when opt-inEnabled=true, cancellation requires start-now>=24h in configured office timezone. Exactly24h allowed; within24h bookings have no automatic exception; elapsed starts blocked; no added fees or privileged override. Original terminal checks retained.
- **reason:** Deterministic boundary and server-owned capability avoid client clocks; retaining default preserves current cancellation rights until approval. Rejected-state lifecycle treatment still a separate group decision.
- **changes:** ProposedCancellationPolicy.cs; AppointmentService.cs; Program.cs; mobile my_appointments_screen.dart respectscanCancel and existing active statuses
- **tests:** Five enabled boundary/capability/state tests; existing three disabled notice tests; two real Flutter cancellation-button widget tests
- **results:** Allowed1440/1441, rejected1439/0/-1 with unchanged status/slot/history; default cancellation suitePASS; all60FlutterPASS
- **approval:** PROPOSED — PENDING GROUP APPROVAL; ProposedRules:Cancellation:Enabled=false default; no enabled default change or ledgerPASS conversion

## TC-C3-12 / FA-DEF-01

- **historical:** Atomic request+three-files operation rollback/no orphans
- **existing:** Request is created separately; each upload has its own DBsave. Development storage writes before metadata; failed save left a physical orphan. Staging bytes+metadata share DBtransaction.
- **spec:** NFR03 ACID/zeroorphanrecords; V3 Section15 failed-attachment rollback; does not establish existing HTTPbatch semantics
- **root:** Filesystem persistence and DBsave lack compensation; three independent HTTPrequests have no commontransaction
- **rule:** CONFIRMED TECHNICAL DEFECT: compensate handled upload/sample-save failures by removing owned bytes and clearing failed scoped changes. PROPOSED batch service contract:1–5existing-request attachments, owned relationaltransaction, compensating all prior files on failure; disabled and no HTTProute/UIcall. Reject filesystem upload inside unknown ambienttransaction to prevent later unobserved rollback.
- **reason:** Small safe cleanup fix preserves single-fileAPI. Explicit batch avoids pretending current sequentialUIcalls are atomic. Request creation is outsidebatch, not deleted. No filesystem crash-atomicity claim.
- **changes:** DocumentFileService.cs; ProposedRules:AtomicDocumentBatch=false default; UploadFilesAtomicallyAsync callable only by explicit opt-inservicecaller
- **tests:** Original realPostgreSQLdevelopmentfailure (FAIL); same testafterfixPASS; development/staging second-validation and second-save failures rollback allrows/status/bytes; development/staging twofilecommit/downloadPASS; default batchdisabledPASS; existingPDFregressions12PASS
- **results:** 27newdecisiontestsPASS within70targetedPASS; final365backend362PASS1FAIL2SKIP. Original C3-12 fullHTTP atomicworkflow stillBLOCKED; partial technical blocker resolved only.
- **approval:** Cleanup is authorised technicalfix. Batch contract PROPOSED — PENDING GROUP APPROVAL; no route/defaultbusinessworkflow changed. Crash cleanup/futureclientbatchdesign remainsmanual decision

## Other decisions retained

- **TC-BK-01:** BCrypt cost12 versus11. Security policy/cost tradeoff; propose12 aftergroupapproval; preservecurrentdefault and failingtest.
- **TC-BK-02:** Plain JWTwireclaim names versusClaimTypesURIs. Interoperability naming decision; do not weaken authentication or rewrite existingclaims.
- **TC-BK-07 / C1 tariffs:** Billable tariffs/service endpoints versus catalogue. Propose separate billable-service model only after financial workflow approval; no newfees.
- **TC-MOB-05:** Encrypted token storage versus SharedPreferences. Recommendplatformsecurestorage; neednative/webthreatmodel and migration/approval, roundtripPASS isnot encryption.
- **TC-C3-01/04 / E2Estatus:** Historicalservice1/Deed/Approved versuscurrentcatalogue/statuses. Propose explicit mapping/statusdecision; do not turnCOMPLETED intoApproved or reviveobsolete routes.
- **TC-DB-01:** ColdTLS<200ms versus585.067ms. Connectioncoldsetup differsAPIp95. PreserveFAIL; noarbitraryassertionchange or productionNeon tests.

Final workforce consistency retest: the optional80%default is returned bysettings/snapshot and used byassessment; explicitcustom0.66 remains0.66. Both newtestsPASS in the final365-case backendrun (362PASS/1FAIL/2SKIP). The laternativeTLSassertionpasses; priorcoldfailure remains in the77caseledger without claiming aperformancefix.
