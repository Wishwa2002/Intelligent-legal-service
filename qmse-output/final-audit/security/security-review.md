# Targeted security review

All code/config changes are local and AI-assisted. No production scan, credential authentication attempt, rotation, push or deployment.

## Historical credential incident

Read-only Git inspection confirms non-placeholder PostgreSQL/Neon connection credential material in original commitc0ea64584769a65b217a2eadb1a4a30489bd4af0 (Wishwa,2026-08-19T00:00:08+05:30). Two historical artifacts contain credential-like material; one path still exists at the testedHEAD but its current contents do not contain the old credential. No exact credential value remains in current tracked files. Filename/content/values are withheld; no login was attempted. Treat as an exposed-credential incident until the owner confirms revocation/rotation. Current ignored local environment credentials are not evidence of committed leakage. Details:credential-finding.json.

## Owner rotation checklist

- Confirm the affected PostgreSQL/Neon role and every service using it privately; do not paste the credential into issue/report/chat.
- Rotate/revoke the exposed credential in the provider console under owner approval; update backend/databaseconsumersecretconfiguration.
- Review provider access/audit logs for unexpected access since2026-08-19; assess affected data if warranted.
- Verify oldcredential invalid and newserviceconnectivity using approved controlled checks.
- Record rotation date/status without secret values; consider separately approved historycleanup/forks/cache handling and secret-scanning protection. Historyrewriting alone does not revoke a credential.

## Missing nosniff — low-severity configuration finding

Confirmed on all six sampled local responses beforepatch. SecurityHeadersMiddleware is registered before errors/auth so itsOnStarting callback setsX-Content-Type-Options:nosniff on success,error,401 and404. Four realHTTPregressiontestsPASS. ZAP2.17.0 passive-only same sixpaths:before3alertinstances(one low-severitytype),after0alerts;before/aftermetadata confirms all headers. Scope is localhost55543, isolatedPostgres and synthetic data; no active scan. Zero sampled alerts is not proof that the application has no vulnerabilities. Original scan evidence remains intact.

## Dependency results

Returned matches fall70→21 across6→3affectedpackages; not an exploited-vulnerability count. Targeted patches arePillow10.4.0→12.3.0,python-dotenv1.0.1→1.2.2,python-multipart0.0.9→0.0.31. Pillow crosses amajor boundary specifically to reach securityfixes, with actual114AIregressiontestsPASS andpipcheckclean; no unrelated majorupgrade. The3packages have zero postpatch returnedmatches.

| Package | Before → after | Matches before → after | Scope/action |
|---|---|---|---|
| chromadb | 1.5.9 → 1.5.9 | 5 → 5 | Embedded RAGvectorstore; no standaloneChromaHTTPserver intentionally started. Advisoryservercodeexecution reachability not established; no patchedversion indicated. Remaining; no unsafe standalone core/major upgrade or unsupported reachability claim |
| pillow | 10.4.0 → 12.3.0 | 33 → 0 | Image.open in document OCR; PSD-specific findings depend on supported input formats; upgraded locally and114AItestsPASS. Targeted dependency patch; zero postpatch matches for this package |
| pytest | 8.2.2 → 8.2.2 | 2 → 2 | Local testtool; not exposedbyAPI. Securityfixedversion9.0.3 is major and needs pytest-asyncio compatibility work. Remaining; no unsafe standalone core/major upgrade or unsupported reachability claim |
| python-dotenv | 1.0.1 → 1.2.2 | 2 → 0 | Imported for configuration; no appset_key/unset_key use found; targeted preventivepatch. Targeted dependency patch; zero postpatch matches for this package |
| python-multipart | 0.0.9 → 0.0.31 | 14 → 0 | FastAPIagentupload multipart parsing is used; parseradvisories materially relevant. Targeted dependency patch; zero postpatch matches for this package |
| starlette | 0.37.2 → 0.37.2 | 14 → 14 | FastAPIASGI/multipart routes; currentFastAPI0.111 pinsStarlette<0.38, so a coordinated coreframeworkupgrade is needed. Remaining; no unsafe standalone core/major upgrade or unsupported reachability claim |

RemainingStarlette/ChromaDB/pytest findings need coordinated compatibleupgrade or reachabilityreview. No ChromaHTTPexploit or nativepytestattack was executed. npmverification isBLOCKEDbycertificate-chainerrors. NuGetreportedno listedadvisories in itsqueried project/transitives. Dependabotdefaultbranchcounts arehistoricalcontext, not finalworkingtreeaudit. NativeJSONhasall IDs/patchversions; dependency-review.json links the actual GitHub-reviewed advisorypages.

Primary examples: [multipart parser DoS](https://github.com/advisories/GHSA-59g5-xgcq-4qw3), [dotenv symlink write](https://github.com/advisories/GHSA-mf9w-mj56-hr94), [Pillow PSD write](https://github.com/advisories/GHSA-cfh3-3jmp-rvhc).
