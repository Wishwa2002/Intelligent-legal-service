from pathlib import Path
import json
P=Path('qmse-output/final-audit');L=json.loads(Path('qmse-output/historical-resolution/test-results/case-verification.json').read_text())
M={
'TC-E2E-01':('Historical fixtures; changed intake','Confirm Deed/service-1 mapping and original two-PDF multipart fixture.','Partial local UI works; members confirm original workflow.','Original integrated scenario; separate real Affidavit workflow already verified.'),
'TC-E2E-05':('Gemini unavailable; historical bundle missing','Available provider and new spending approval; approved four-document bundle.','Cannot resolve provider/fixture authority locally.','AI task completion / original integration.'),
'TC-E2E-07':('Changed functionality; unapproved status mapping','Approve COMPLETED versus Approved meaning before end-to-end sync acceptance.','Requires group/lecturer decision.','Original integrated end-state incomplete.'),
'TC-C104':('Gemini unavailable; ranking requirement unresolved','Operational recommendation service, new live budget and approved top-three/>90% score criteria.','Service setup local; provider and scoring approval external.','Selected AI evaluation.'),
'TC-C105':('Separate drafting service unavailable; full forecast incomplete','Run drafting service and newly authorised provider; approve forecast criteria.','Local service setup possible; live acceptance blocked.','Selected workforce/AI evaluation.'),
'TC-C2-05':('Changed classifier; Gemini unavailable','Current scheduling session input/output acceptance and new live budget.','Date helper passes only; full timestamp blocked.','AI structured output/task completion.'),
'TC-C3-08':('Historical OCR fixtures missing; Gemini unavailable; confidence rule unapproved','Original labelled scan and confidence criterion, fallback approval, provider/new budget.','Cannot invent equivalent original fixture.','Selected AI failure/safe-failure coverage.'),
'TC-C3-12':('Atomic boundary unapproved','Decide whether three separate HTTP uploads must share creation transaction.','Defined per-attachment/caller transaction tests already pass; new batch operation needs approval.','Required database transaction area has scoped genuine evidence.'),
'TC-C4-04':('Gemini unavailable','Available chat provider/new budget; actual refusal response.','Sanitizer subcriterion local, not full chat acceptance.','Selected AI prompt-injection/safe-failure.'),
'TC-C4-05':('Gemini unavailable; expert relevance labels missing','Approved legal relevance labels, corpus and disclaimer; provider/new budget.','Hybrid retrieval local; final advice/relevance needs experts/provider.','AI evaluation/evidence accuracy.'),
'TC-C4-08':('Expert labels missing; ranking revision unapproved','Approve labelled queries/precision metric and k=40 versus60.','Synthetic RRF mechanics local; legal precision not proven.','Selected AI evaluation; no literal k target in assignment.'),
'TC-C4-12':('Provider unavailable; disclaimer contract unapproved','Approve wording/enforcement, new bounded live budget.','Deterministic enforcement could follow approval; finite responses cannot prove universal claim.','Selected AI guardrail/business-rule evaluation.')}
rows=[]
for c in L:
 if c['status']!='BLOCKED':continue
 kind,needed,local,effect=M[c['test_id']];rows.append({'test_id':c['test_id'],'categories':kind,'observed':c['observed'],'required_to_unblock':needed,'codex_local_resolution':local,'member_or_lecturer_confirmation':'Member confirmation; lecturer if authoritative specification remains disputed','explicit_assignment_effect':effect,'evidence':c['evidence']})
assert len(rows)==12;(P/'blocked-case-register.json').write_text(json.dumps(rows,indent=2));lines=['# Blocked-case register','','Twelve original BLOCKED cases. No new provider calls are authorised or executed. Selected tests are not universal assignment mandates; integration, tool evidence and individual demonstrations remain explicit assessment requirements.','','| Case | Proven blocker | Unblocking action / local scope | Assignment effect |','|---|---|---|---|']
for r in rows:lines.append('| '+r['test_id']+' | '+r['categories']+' | '+r['required_to_unblock']+' '+r['codex_local_resolution']+' | '+r['explicit_assignment_effect']+' |')
(P/'blocked-case-register.md').write_text('\n'.join(lines)+'\n')
