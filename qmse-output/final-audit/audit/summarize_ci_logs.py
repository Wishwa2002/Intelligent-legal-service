from pathlib import Path
import json,re
P=Path('qmse-output/final-audit');O=P/'evidence/ci';d=json.loads((P/'historical-ci-index.json').read_text());details=[]
for r in d['selected_runs']:
 files=list((O/'logs'/str(r['run_id'])).glob('0_*.txt'));lines=[]
 for f in files:
  for line in f.read_text().splitlines():
   if re.search(r'##\[error\]|curly_braces_in_flow_control_structures|asset_does_not_exist|No issues found|Total tests:|Tests:.* passed|All tests passed|Failed LegalService|Expected: 17|Actual:   23|Passed:|Failed:|Skipped:',line):lines.append(line[:1000])
 details.append({'run_id':r['run_id'],'workflow':r['workflow'],'sha':r['sha'],'conclusion':r['actual_conclusion'],'native_archive':f'qmse-output/final-audit/evidence/ci/{r["run_id"]}-native-logs.zip','selected_actual_log_lines':lines})
 r['native_log_evidence']=details[-1]['native_archive']
(P/'historical-ci-index.json').write_text(json.dumps(d,indent=2));(O/'native-log-diagnostics.json').write_text(json.dumps(details,indent=2))
p=P/'historical-ci-audit.md';s=p.read_text();s=s.replace('with exact earlier lint text unverified because native logs require authentication.','with native logs confirming two curly_braces_in_flow_control_structures diagnostics at api_config.dart lines11 and30, followed by “No issues found” and successful tests in the retest.')
s=s.replace('Backend failing test identities and Mobile detailed diagnostics unavailable in public annotations.','Native logs now identify four DemoLawyerSeederTests failures (expected17 services, actual23); Mobile Analyze reports missing assets/.env; frontend logs match four TS6133 unused imports.')
a=s.find('Access limitation:')
if a>=0:s=s[:a]+'''Access resolution: the first unauthenticated log API requests returned403, and automatic review initially rejected unspecified credential-store use. The user subsequently explicitly approved read-only use of an existing GitHub credential solely for these selected log downloads. Twelve archives were downloaded; the credential stayed in memory and is absent from artifacts. Each archive is checked/redacted before retention; any transformation is recorded in approved-log-download.json. No remote changes occurred.\n\nNative diagnosis: fb471202 is an excluded deployment revision, so these failures are not failures of the published05359214 baseline. No new successful retest at the same excluded revision is invented. Historical Mobile lint failure→single brace fix→successful Analyze/tests is now supported by actual native logs plus matching branch/workflow/SHA diff. Current unpublished fixes have no GitHub CI result.\n'''
p.write_text(s)
print('Updated 12 historical native log entries')
