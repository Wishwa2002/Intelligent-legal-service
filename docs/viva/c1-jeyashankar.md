# Jeyashankar J: C1 viva card

Scope: lawyer management, specializations, legal services, recommendation integration and workforce capacity. Supporting catalogue/identity/scheduling code is shared across components.

## Run and explain

```sh
python3 scripts/viva-check.py --member c1
```

Open `backend/LegalService.Tests/LawyerManagementHttpTests.cs` and its partial class `QmseHttpTests.cs`. Explain the loopback Kestrel HTTP server, synthetic JWTs, isolated EF InMemory database, seeded lawyer and stubbed AI transport. Requests exercise routing, authorization and controllers. This does not prove PostgreSQL constraints or live Gemini output.

Start with `Qmse_TC_C108_DuplicateLicenseReturns409WithoutInsertion`: arrange an existing lawyer; POST another with the same license; assert HTTP 409 AND no extra persisted row. A status-only assertion could miss a data-integrity defect. Then show unknown-specialization rejection, role-based write restrictions and the ordinary successful management paths in the fixture.

The full runner adds `Member1PostgresTests`, `RecurringSchedulingPostgresTests`, workforce relational tests and migration checks on freshly created databases. Those establish real-provider persistence/concurrency behavior independently of EF InMemory tests.

## Practice questions

- Why xUnit? Native .NET async tests, theories for input sets, fixtures, filters and machine-readable TRX.
- What is integration here? Real HTTP, middleware/controllers/services and a test database; the AI transport is substituted. Database-provider integration is tested separately against PostgreSQL.
- Why assert no mutation on failure? An HTTP 409 must not conceal an inserted duplicate record.
- What does mocking AI prove? Request/response contract, filtering, approval and error handling; it cannot measure model accuracy.
- What happens when Gemini returns 503? Return a controlled failure; do not create a booking or silently invent recommendations. Show deterministic resilience tests, not a claim of live success.
- Is workforce analysis a validated forecast? No. Current capacity/demand calculations and mocked drafts are distinct from expert-validated predictive forecasting.
- What remains unresolved? Historical service-price, availability-toggle, query-length and workforce rule expectations; live matching/draft success.

## Modification exercise

On a temporary local edit, change the duplicate-license input to a unique value and predict which conflict assertion fails. Run only that test, explain the result, restore the original and rerun. Do not leave the deliberate failing edit in submitted source.

## Evidence and ownership

Show `c1.trx` in your fresh run directory. Show the actual relevant Git commits (`git log --oneline -- backend/LegalService.API/Controllers/LawyersController.cs backend/LegalService.Tests/LawyerManagementHttpTests.cs`). Explain what you personally wrote or checked, and disclose AI-assisted additions. The prior report's C1 7/4/2 case counts remain historical; this focused test population is different.
