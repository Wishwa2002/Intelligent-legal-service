# Targeted historical CI audit

Original group repository only. Twelve focused run entries covering four requested revisions; all fetched native metadata/jobs/annotations remain in evidence/ci. No workflows changed, dispatched or pushed.

| SHA | Workflow | Run | Date UTC | Branch / trigger | Actual result |
|---|---|---|---|---|---|
| 8a9b8a24 | Frontend CI | [37386601420](https://github.com/Wishwa2002/Intelligent-legal-service/actions/runs/37386601420) | 2026-10-05T23:06:51Z | chore/deployment-readiness / pull_request | success |
| 8a9b8a24 | Backend CI | [37386601103](https://github.com/Wishwa2002/Intelligent-legal-service/actions/runs/37386601103) | 2026-10-05T23:06:50Z | chore/deployment-readiness / pull_request | success |
| 8a9b8a24 | Mobile CI | [37386601104](https://github.com/Wishwa2002/Intelligent-legal-service/actions/runs/37386601104) | 2026-10-05T23:06:50Z | chore/deployment-readiness / pull_request | success |
| 54aecccc | Backend CI | [37415146816](https://github.com/Wishwa2002/Intelligent-legal-service/actions/runs/37415146816) | 2026-10-06T04:44:40Z | develop / pull_request | success |
| 54aecccc | Mobile CI | [37415146862](https://github.com/Wishwa2002/Intelligent-legal-service/actions/runs/37415146862) | 2026-10-06T04:44:40Z | develop / pull_request | success |
| 54aecccc | Frontend CI | [37415147442](https://github.com/Wishwa2002/Intelligent-legal-service/actions/runs/37415147442) | 2026-10-06T04:44:40Z | develop / pull_request | success |
| 6d982e60 | Backend CI | [37385133126](https://github.com/Wishwa2002/Intelligent-legal-service/actions/runs/37385133126) | 2026-10-05T22:51:58Z | chore/deployment-readiness / pull_request | success |
| 6d982e60 | Mobile CI | [37385133013](https://github.com/Wishwa2002/Intelligent-legal-service/actions/runs/37385133013) | 2026-10-05T22:51:58Z | chore/deployment-readiness / pull_request | failure |
| 6d982e60 | Frontend CI | [37385133035](https://github.com/Wishwa2002/Intelligent-legal-service/actions/runs/37385133035) | 2026-10-05T22:51:58Z | chore/deployment-readiness / pull_request | success |
| fb471202 | Mobile CI | [37717885208](https://github.com/Wishwa2002/Intelligent-legal-service/actions/runs/37717885208) | 2026-10-08T02:26:35Z | feature/appointment-scheduling-enhancements / pull_request | failure |
| fb471202 | Frontend CI | [37717885104](https://github.com/Wishwa2002/Intelligent-legal-service/actions/runs/37717885104) | 2026-10-08T02:26:35Z | feature/appointment-scheduling-enhancements / pull_request | failure |
| fb471202 | Backend CI | [37717885253](https://github.com/Wishwa2002/Intelligent-legal-service/actions/runs/37717885253) | 2026-10-08T02:26:35Z | feature/appointment-scheduling-enhancements / pull_request | failure |

Mobile sequence: failed Analyze at 6d982e60 / run37385133013; single lint-brace correction 8a9b8a24; successful Analyze and tests at run37386601104. This is verified chronology/diff, with native logs confirming two curly_braces_in_flow_control_structures diagnostics at api_config.dart lines11 and30, followed by “No issues found” and successful tests in the retest.

fb471202: Mobile Analyze failure; frontend Build frontend failure with unused Briefcase/Link/Scale/ArrowRight annotations and exit2; backend Run tests failure/exit1. Native logs now identify four DemoLawyerSeederTests failures (expected17 services, actual23); Mobile Analyze reports missing assets/.env; frontend logs match four TS6133 unused imports. No matching successful retest for this excluded deployment revision is claimed.

54aecccc: successful backend/frontend/mobile metadata; two runs per workflow exist at the same SHA and original API pages are preserved. This member1 merge revision is historical, not the final testing commit.

Exact QMSE SHA has zero observed runs. The source workflows push only main/develop and have no manual workflow_dispatch. Historical successes never certify current local overlays.

Five new genuine GitHub screenshots: backend success, frontend success, Mobile retest success, Mobile failure, frontend error detail. Earlier deployment and group screenshots remain preserved.

Access resolution: the first unauthenticated log API requests returned403, and automatic review initially rejected unspecified credential-store use. The user subsequently explicitly approved read-only use of an existing GitHub credential solely for these selected log downloads. Twelve archives were downloaded; the credential stayed in memory and is absent from artifacts. Each archive is checked/redacted before retention; any transformation is recorded in approved-log-download.json. No remote changes occurred.

Native diagnosis: fb471202 is an excluded deployment revision, so these failures are not failures of the published05359214 baseline. No new successful retest at the same excluded revision is invented. Historical Mobile lint failure→single brace fix→successful Analyze/tests is now supported by actual native logs plus matching branch/workflow/SHA diff. Current unpublished fixes have no GitHub CI result.
