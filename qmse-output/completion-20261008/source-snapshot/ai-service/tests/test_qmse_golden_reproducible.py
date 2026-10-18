"""Deterministic subcriteria only; never label these live Gemini Golden Case passes."""
import json
from pathlib import Path
import pytest
from app.agents.completeness import evaluate_completeness
from app.security.injection_defense import sanitize_document_text
DATA=json.loads(Path(__file__).with_name('qmse_golden_cases.json').read_text())
@pytest.mark.parametrize('provided,status,missing',[
 (['NIC','Survey Plan'],'INCOMPLETE','PROPERTY_DEED'),
 (['NIC','PROPERTY_DEED','APPLICATION_FORM','CONTRACT'],'READY_FOR_ASSIGNMENT',None),
 ([], 'INCOMPLETE','NIC')])
def test_gc03_actual_completeness(provided,status,missing):
 case=DATA['cases'][2]
 result=evaluate_completeness(case['input']['required'],provided,case_id='GC-03')
 assert result.status==status
 if missing:assert missing in result.missing_documents
 else:assert result.missing_documents==[]
 print(json.dumps({'case':'GC-03 deterministic subcriteria','input':provided,'actual':result.model_dump(),'criteria_met':True}))
def test_gc04_sanitizer_isolates_untrusted_text_without_claiming_refusal():
 text=DATA['cases'][3]['input']['query']
 result=sanitize_document_text(text)
 assert text in result
 assert result != text
 print(json.dumps({'case':'GC-04 sanitizer characterization only','input':text,'actual':result,'full_refusal_test':'BLOCKED: no live consultation output'}))
