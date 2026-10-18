Publication update: exact approved SHA published and remotely verified on 2026-10-08 at 08:44:51 UTC. Main and all pre-existing branch tips unchanged. GitHub reports zero runs for the new SHA/branch; three source CI workflows exclude it. Post-publication proof: evidence/publication-verification.json and ci-verification.json. Earlier approval-pending text below is retained as dated audit history.

# Git commit-history evidence — pre-publication audit

Audited 2026-10-08T08:33:19.728706+00:00. Public branch tips fetched; no remote writes performed.

Group main 59337bba0227aa07e18e60f697bd758db327f0bd contains 14 reachable commits. All are preserved as ancestors of source 05359214df52fa743b234e1d77e6671f57c14dea.

**Main does not currently contain commits under all four member identities.** Its author strings are Wishwa/Wishwa Wijayananda and yh prasad/yhprasad. Jeyashankar and VTN02-labelled commits are present on develop/feature history incorporated in the tested branch. Do not describe all four contributions as main commits or infer personal effort from author strings.

83 commits beyond main are retained, of which 81 already exist in other group branches. Two newly reachable QMSE commits: f360e4a and 0535921. Actual recorded author for both is Jeyamdev; work is Codex-assisted and not new proof of individual student effort.

Deployment main is now 43520622e8d39af29ccbaa0eab4c78766210e69a; divergence is 2 tested-only and 11 deployment-only commits from shared base 8a9b8a24f5a567460f90e60b3b6675ed02230062. Those 11 changes were not part of this QA run and are excluded from this exact tested publication.

## Original main author records

| SHA | Author date | Recorded author | Subject |
|---|---|---|---|
| 59337bba0227aa07e18e60f697bd758db327f0bd | 2026-08-25T19:08:10+05:30 | Wishwa Wijayananda | Merge pull request #6 from Wishwa2002/feature/database-setup |
| 2e2f764e18843b6832e7352ba64ea0848a3842b6 | 2026-08-25T15:09:32+05:30 | yhprasad | feat(database): implement complete legal platform schema, seeds, and ADRs |
| a9608877e21ca2a07dc049a81608ee964eb8e344 | 2026-08-23T16:37:36+05:30 | Wishwa Wijayananda | Merge pull request #4 from Wishwa2002/feature/frontend-setup |
| 7db28170ac4c2c44a173e3233291675b34903575 | 2026-08-23T16:33:18+05:30 | Wishwa | feat(frontend): add public landing page and common components |
| 6f78d19337b00a74c214da3f7ecec215225588f9 | 2026-08-22T12:09:14+05:30 | Wishwa Wijayananda | Merge pull request #3 from Wishwa2002/feature/frontend-setup |
| 91d96284d9cc4b3b330d9fd2d87372bf3447dd06 | 2026-08-22T12:04:35+05:30 | Wishwa | Setup React TypeScript Tailwind frontend structure |
| 0fce3fd424d5c1948b2b16a7007cb550b975984f | 2026-08-19T14:34:50+05:30 | Wishwa Wijayananda | Merge pull request #2 from Wishwa2002/feature/authentication |
| 56f4bbd42099e6a803277ec52fde84fcbf218ac7 | 2026-08-19T14:31:17+05:30 | Wishwa | Implement user registration and role assignment |
| 3e0403f3eb57b8adb7bef395b1b3df1f89ecc313 | 2026-08-19T12:02:02+05:30 | yh prasad | Merge pull request #1 from Wishwa2002/develop |
| 3beb4c6ddf881200747a42e0c85154a51fb69d6b | 2026-08-19T00:26:55+05:30 | Wishwa | Add complete project folder structure |
| 043336bfdfb8f3add72f9dfafd289fa9533a5d41 | 2026-08-19T00:09:28+05:30 | Wishwa | Complete merge of remote develop branch |
| 55057163b4d14aa94cd937eed15b4e0aee3ae96c | 2026-08-19T00:07:35+05:30 | Wishwa | Merge GitHub develop branch with local project |
| c0ea64584769a65b217a2eadb1a4a30489bd4af0 | 2026-08-19T00:00:08+05:30 | Wishwa | Initial project structure and ASP.NET Core setup |
| 59e413c7742dd0e2c5c5662ed79784203646aa49 | 2026-08-18T12:01:34+05:30 | Wishwa Wijayananda | Initial commit |

## New QMSE records

| SHA | Author date | Recorded author | Subject |
|---|---|---|---|
| 05359214df52fa743b234e1d77e6671f57c14dea | 2026-10-08T11:00:40+05:30 | Jeyamdev | Preserve executed isolated QMSE workflow, security and performance scripts |
| f360e4ac21f149ae5b90a125c57bf928982a9c53 | 2026-10-08T10:42:35+05:30 | Jeyamdev | Fix validated uploads and integrated clerk workflow; add QMSE regression evidence tests |

Full machine-readable logs include author emails and separate committer dates in evidence/*-commits.json; author information is preserved, never rewritten. Native branch metadata and genuine browser captures are retained.

## CI scope

Backend CI, Frontend CI and Mobile CI push filters allow only main/develop. Publishing se3110-qmse-testing does not match. No AI workflow exists in this source. No successful new-branch workflow is claimed. After approval, query Actions for published SHA and distinguish absent/filtered workflows from successful execution.

## Files and evidence

Tracked tree: 1159 files; largest 848831 bytes. No tracked file exceeds 5 MiB; no historical blob reachable beyond main exceeds 5 MiB either. Actual .env files are ignored and absent from tracked tree. Explicit example files, demo/test credentials and existing source screenshots are tracked. Heuristic credential scan results are in audit/sensitive-file-audit.json.

Final DOCX/PDF, native execution reports, evidence ZIPs, Playwright generated report and .dotnet runtime cache are untracked; they will not be included in this SHA push. Reusable runner/test scripts are committed. Keep the full evidence package as a separate submission artifact; do not add runtime caches or ZIPs to this branch.

## Approval pending

Exact proposed push:
```sh
git push https://github.com/Wishwa2002/Intelligent-legal-service.git 05359214df52fa743b234e1d77e6671f57c14dea:refs/heads/se3110-qmse-testing
```
No force flag, no main/develop update, no merge/rebase or authorship rewrite. Recheck branch absence before execution; if another branch appears, stop and report the conflict. Updated publication-qualified DOCX/PDF and post-push screenshots will follow successful verification.

Historical sensitive-file review: a pre-existing database connection artifact is reachable on old main. It was already public before publication and is absent from the tested tree. Its contents and any credential-like filename are excluded from screenshots/package; member credential rotation/review is required. No history rewrite was performed.
