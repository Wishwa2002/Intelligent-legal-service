"""AI-assisted historical acceptance replay. No live Gemini invocation.
These cases preserve old expectations and expose mismatches; complementary subcriteria
must not be presented as full provider or retrieval acceptance.
"""
from datetime import datetime,timezone,timedelta
from app.agents.completeness import evaluate_completeness
from app.agents.scheduling.classifier import _parse_date_hint
from app.retrieval.rrf import compute_rrf,RRF_K
from app.security.injection_defense import sanitize_document_text

def test_C3_05_missing_title_deed_accepted_four_item_contract():
 required=['NIC Copy','Prior Title Deed Copy','Survey Plan','Sale Agreement Draft'] # actual Property Transfer seed requirements
 provided=['NIC Copy','Survey Plan','Sale Agreement Draft']
 result=evaluate_completeness(required,provided).model_dump()
 ratio=100*len(result['provided_documents'])/len(required)
 print({'case':'TC-C3-05','required':required,'provided':provided,'actual':result,'percent':ratio,'scope':'real deterministic completeness logic, not Gemini'})
 assert ratio==75, 'Accepted current four-item fixture with three provided; 75% is deterministic coverage, not AI accuracy.'
