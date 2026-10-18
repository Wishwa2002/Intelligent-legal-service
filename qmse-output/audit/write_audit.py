from pathlib import Path
import json,re,collections
R=Path(__file__).resolve().parents[2];O=R/'qmse-output';s=json.load(open(O/'test-results/summary.json'));snap=json.load(open(O/'audit/snapshot.json'));text=(O/'audit/original-report-text.txt').read_text();files=(O/'audit/repository-inventory.txt').read_text().splitlines();base={Path(f).name for f in files};mentioned=sorted(set(re.findall(r'[\w-]+\.(?:cs|spec\.ts|test\.dart|dart|py|yml)',text)));missing=[m for m in mentioned if m not in base];(O/'audit/missing-report-references.json').write_text(json.dumps(missing,indent=2))
content=f'''# Report audit — LegalEase AI / 2026-SE-42

## Provenance and authorization

Tested checkout: `{snap['commit']}`, local branch `{snap['branch']}`. The requested remote `docs/se3110-qmse-testing` branch returned HTTP 404 from GitHub (evidence/ci/requested-branch.json). Local origin is Wishwa2002/Intelligent-legal-service; the `deployment` remote points to Jeyamdev/legalease-ai. No push, deployment, submission or application-business-logic edit was performed.

Original input hashes are in input-hashes.json. The supplied assignment is assessment evidence, not authority to scan public systems or submit. The original report explicitly states its figures were copied from another report and AI did not execute them; therefore old PASS cells are historical/unverified unless independently mapped to a current execution.

## Verified implementation and available tools

- Root solution: LegalService.sln. API: backend/LegalService.API/LegalService.API.csproj; tests: backend/LegalService.Tests/LegalService.Tests.csproj, .NET 8, xUnit/Moq/EF InMemory/Npgsql/Coverlet. HTTP tests use actual isolated Kestrel hosts, not WebApplicationFactory.
- EF Core ApplicationDbContext and migrations use PostgreSQL. A temporary PostgreSQL cluster on loopback 55442 supported current integration and concurrency tests. These tests do not contact Neon or production.
- Frontend React/TypeScript/Vite. package.json scripts: test/test:e2e = Playwright; test:member1 = Node test runner using React server rendering/Vite. No Vitest, Jest or React Testing Library dependency is declared.
- 14 Playwright .spec.ts files; {s['playwright']['total']} cases discovered, {s['playwright']['passed']} passed, {s['playwright']['skipped']} opt-in live-backend cases skipped. Most browser API traffic is mocked. '14 passing suites' is replaced with case counts and explicit scope.
- Python FastAPI/Pydantic/LangGraph/Google GenAI implementation exists. Final deterministic/mocked pytest: {s['ai']['passed']}/{s['ai']['total']} passing. Initial 86/88 pass with 2 missing-key initialization failures is retained. A synthetic invalid provider key enables construction only; no live provider behaviour is inferred.
- Six original Flutter test files exist. Mobile runtime/setup outcome is recorded separately; all historical mobile claims require exact current-case mapping.
- Three GitHub Actions workflows: backend-ci.yml, frontend-ci.yml, mobile-ci.yml. They are filtered to main/develop and component paths, not every push on every branch. Public CI metadata contains historical successes and failures; it does not certify this locally modified checkout.
- Tooling obtained for this task: OWASP ZAP 2.17.0, k6 2.3.0, LibreOffice 26.8.0 and Poppler. Installed tooling alone is not test evidence. Docker daemon was unavailable; PostgreSQL fixtures provided isolation instead.

## Contradictions and unsupported claims

1. Lawyer input uses LicenseNumber, not BarNumber/CreateLawyerDto. Specialization IDs are integers; lawyer/slot/appointment IDs are GUIDs.
2. Recommendation DTO uses requirement (3–4000 chars), not query (10–1000). Report inputs 9 and 1001 are accepted by current schema. Requirement owner must confirm the approved boundary; tests do not change it.
3. Current matching filters active, single-area practitioners and ranks recorded experience (0–70); no 40/30/20/10 formula, win rates or asserted scores 96/92/91. Percentages and >90 thresholds are unsupported.
4. Workforce assesses recorded demand/capacity, configurable minimums and a default 0.75 watch ratio; drafting.py does not impose the claimed <20% headroom trigger. 19/20/21% cases all classify WATCH under tested current rules.
5. Cancellation code contains no 24-hour notice rule. 23h59m, 24h00m and 24h01m before appointment are all cancellable in fixtures. This contradicts the report, but the original SE3090 approved rule was not supplied.
6. Current outside-hours booking returns service-level 409, not the reported 400. Successful booking status is Requested, not Confirmed. Documentation status starts PENDING, not PendingChecklist.
7. Appointment uniqueness is tied to SlotId and recurring-scheduling overlap protection; the asserted unique (LawyerId, AppointmentDate) key is not the current model. Different provider tests must not be conflated.
8. DocumentFileService validates size, extension and supplied MIME, but has no magic-byte inspection. Inert MZ bytes named .pdf and application/pdf were accepted; Qmse_DEF12_SpoofedPdfMustBeRejected fails. DEF-12's 'fixed' claim is contradicted.
9. The report's 11-table assertion is contradicted by the much larger DbSet/migration model. Neither Neon version nor cloud table counts were measured.
10. JWT expiry is configuration-driven; tests use 10 minutes. PasswordService invokes BCrypt.HashPassword without an explicit work factor. A universal 24-hour expiry/12-round hashing claim is unsupported.
11. Source files and old commits cannot prove historical HTTP 201/403, 89/142/410/118 ms timings, zero orphan rows, successful mobile-to-clerk synchronization or live Gemini accuracy.
12. Original 281/272/9 backend totals are superseded by actual final TRX. Some originally skipped cases need isolated PostgreSQL, not live cloud secrets. AuthSecurityTests.cs is absent.
13. Golden Cases GC-01–04 have no reproducible accuracy denominator, labeled dataset, scoring harness or run log matching the reported 97–100%. They remain HISTORICAL/UNVERIFIED.
14. Historical performance numbers (42/180/68/140/1450 ms, 450/85/280/120/35 rps) have no original measurement artifact. New k6 results are small-loopback/InMemory/mock measurements, not deployment acceptance evidence.
15. Generic prompt-injection refusal and a disclaimer on every AI reply cannot be established from the tests/data available. Safety tests are narrow deterministic checks, not general protection guarantees.

## Missing/incorrect references

No tracked basename match for: {', '.join('`'+m+'`' for m in missing)}.

Correct workflows are `.github/workflows/*-ci.yml`, correct solution is root LegalService.sln. Correct browser filenames include lawyer-management.spec.ts, derived-booking.spec.ts and admin-workflow-navigation.spec.ts. Correct upload is POST /api/documentation-requests/{{requestId}}/files; signup is POST /api/auth/signup; recommendation is POST /api/lawyer-recommendations; approval is /api/lawyer-recommendations/{{workflowId}}/approve. Old line numbers are not reliable after source evolution.

## Missing evidence and blockers

- Complete Flutter → API → PostgreSQL → live AI → React clerk → Flutter workflow was not reproduced. UI mocks and agent-node tests are not substitutes.
- Live Gemini Golden Cases and latency require approved fixtures, credentials and a bounded paid-call budget. No public service was targeted.
- TC-C3-12 assumes a transactional multi-file filing operation that is not present as a single application operation. EF InMemory cannot verify relational rollback; no complete three-file rollback workflow was executed.
- TC-C4-12 needs ten real consultation responses and an agreed disclaimer contract; no ConsultationResponse.disclaimer schema was found.
- SQL-like search requests were safely handled in an InMemory HTTP fixture; this does not prove relational SQL-injection resistance or absence of all injection paths.
- CI and personal contribution assertions require member confirmation and matching run/commit evidence. All 20 cited commits exist, but authorship is not proof of individual effort or percentages.
- No unaudited historical screenshots are promoted to current evidence. Original document contains no inline screenshots. Current UI images are separately labeled as mocked recurring-scheduling tests.

## Local execution and limitations

See execution-plan.md, test-results/summary.json, machine reports and execution logs. Sandbox socket restrictions aborted initial .NET/Playwright attempts; successful local-access retries are separately retained. DOCX dependencies were bootstrapped into a temporary environment because no bundled dependency loader was exposed. Renderer and temporary SDK/scanner/load tools are documented for reproducibility.
'''
(O/'audit/report-audit.md').write_text(content)
