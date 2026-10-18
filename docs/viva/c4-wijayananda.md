# Wijayananda W. J. W: C4 viva card

Scope: authentication, JWT/RBAC, service requests, consultation integration and security testing coordination.

## Run and explain

```sh
python3 scripts/viva-check.py --member c4
```

Open `backend/LegalService.Tests/QmseHttpTests.cs`, `PasswordCurrentContractTests.cs` and `SecurityHeaderTests.cs`.

- Invalid/failure: `Qmse_TC_C4_09_JwtAuthenticationRejectsMissingInvalidExpiredAndTampered` uses real HTTP authentication to reject four token variants.
- Normal/invalid: cost-12 password hashing accepts the correct password and rejects a wrong one.
- Security property: hashing the same password twice produces different salted hashes; both still verify.
- Compatibility: an existing cost-11 hash remains verifiable after new hashes move to cost 12.
- Error-path coverage: `nosniff` is asserted for 200, 401, 404 and 500 responses through a real HTTP server.

## New defect and retest

The baseline run is preserved at `qmse-output/viva/baseline-before-fixes/backend/`. `TC_BK_01_PasswordHashAndVerification` failed: expected cost marker 12, actual 11. The implementation delegated to BCrypt's implicit default. `PasswordService.HashPassword` now explicitly passes `workFactor: 12`. Explain the stronger CPU work factor, compatibility test and why this is not proof of acceptable production login throughput. Do not print passwords, tokens or complete password hashes in screenshots.

The fresh full-run `backend.trx` contains the original historical assertion passing after the fix. This session's fix/retest is AI-assisted; do not claim that you personally discovered or executed it until you have reproduced it yourself.

## Practice questions

- Hashing versus encryption? Password hashing is a one-way verification operation; stored passwords should not need to be decrypted.
- Authentication versus authorization? Authentication identifies the principal; role/policy checks determine permitted operations. Missing/bad credentials normally yield 401; an authenticated wrong role yields 403.
- What does token tampering change? Signed claims/payload no longer match the signature, so validation must reject the token.
- Why test error responses for headers? Middleware should protect failures as well as successful pages.
- Is RAG retrieval proof of safe generated legal advice? No. Retrieval, generation, grounding and disclaimer behavior need separate acceptance criteria and live evidence.
- Is passing a mocked prompt-injection test a full jailbreak evaluation? No. State the tested input, defense and scope; live generated-output acceptance is distinct.
- What do ZAP and k6 establish? Explain the actual dated scan/load targets, thresholds, alerts/failures and limits. Unit tests do not replace them.

## Modification exercise

In a temporary local edit, change the expected new-hash marker from 12 to 11, predict the failure and run the password filter. Restore the assertion. Then explain why changing production verification to reject old cost-11 hashes would break existing accounts.

## Evidence and ownership

Show fresh `c4.trx`, baseline failure, corrected source and full backend retest. Show real Git history for auth/service-request code and tests. Historical C4 8/0/4 and the original shared ledger are not automatically rewritten by this new rehearsal.
