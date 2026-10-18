# Vithusan V: C3 viva card

Scope: documentation requests, uploads, clerk management/review and document verification integration.

## Run and explain

```sh
python3 scripts/viva-check.py --member c3
```

Open `backend/LegalService.Tests/QmseUploadRegressionTests.cs` and `backend/LegalService.API/Services/DocumentAndClerk/DocumentFileService.cs`.

Explain normal genuine-PDF acceptance, permitted generic/empty MIME labels with valid PDF content, rejected fake PDF bytes, valid images and rejected mismatched MIME. File extensions and browser MIME strings are untrusted metadata. Parser/content validation must check the bytes.

Show the original spoofed-upload failure and later retest under `qmse-output/completion-20261008/evidence/`. Explain why changing the expected status to match unsafe acceptance would hide the defect. The parser fix rejects malformed content before persistence.

The full runner executes `QmseDocumentPostgresTests` and `RequirementsDecisionTests.FailedDevelopmentUploadDoesNotLeaveAnOrphanFile`: induce a real database insertion failure, then assert no file row, unchanged request status and no orphaned development file. A service exception alone would not establish cleanup.

## Practice questions

- Why use a real PDF builder in tests? It produces valid parser-readable bytes, rather than trusting a filename beginning with `.pdf` or a fake signature.
- What is a negative security case? `MZ` executable-like bytes renamed to PDF must be rejected without persistent side effects.
- What does 75% completeness mean? Three provided items from a four-item fixture; arithmetic coverage is not AI classification accuracy.
- Does per-file rollback make three HTTP uploads atomic? No. Separate HTTP requests have separate transaction boundaries. Full request-plus-multiple-upload atomicity is still a separate acceptance issue.
- How is storage tested? In-memory/service fixtures test validation; real PostgreSQL failure tests verify relational rollback; filesystem checks verify orphan cleanup.
- Why distinguish clerk profile ID from login user ID? They are different identifiers; queue filtering must use the clerk profile. Show `frontend/tests/qmse-clerk-identity.spec.ts` and its two UI cases.
- What is still blocked? Full live OCR/classification acceptance, historical status/checklist mappings and the original multi-request atomic boundary.

## Modification exercise

Take a valid PDF test fixture and replace its bytes with `MZ inert` while keeping the PDF name/MIME. Predict rejection, show where it is checked, and explain how a positive-acceptance assertion fails. Restore and rerun. Do not bypass content validation to make the case pass.

## Evidence and ownership

Open fresh `c3.trx`, relational rollback results and the original spoof/retest evidence. Show real Git commits for document services and test files; distinguish your personal verification from AI-assisted work. Historical C3 8/2/2 remains separate from the new native suite results.
