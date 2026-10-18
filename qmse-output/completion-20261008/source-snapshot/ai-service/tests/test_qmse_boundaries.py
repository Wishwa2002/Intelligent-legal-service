"""QMSE deterministic contract checks. No live provider calls or database access."""
import os
from unittest.mock import patch, AsyncMock
import pytest
from pydantic import ValidationError
from fastapi.testclient import TestClient
from lawyer_recommendation.app import RecommendationRequest, app
from lawyer_recommendation.agent import build_recommendation_graph

@pytest.mark.parametrize('length,accepted', [(2,False),(3,True),(9,True),(10,True),(1000,True),(1001,True),(4000,True),(4001,False)])
def test_TC_C107_current_requirement_length(length, accepted):
    if accepted:
        assert len(RecommendationRequest(requirement='x'*length).requirement)==length
    else:
        with pytest.raises(ValidationError): RecommendationRequest(requirement='x'*length)

@pytest.mark.asyncio
async def test_TC_C111_current_experience_score_boundaries():
    class Data:
        async def catalogs(self): return [{'id':1,'name':'Property'}], []
        async def candidates(self, ids, date=None):
            return [dict(lawyerId=str(n),status='Active',experience=n,specializations=[{'id':1,'name':'Property'}]) for n in [-1,0,70,71,100]]
    class Classifier:
        async def classify(self, requirement, categories, services): return dict(requirement=requirement,categoryId=1,categoryName='Property',preferredDate=None,location=None,keywords=[])
    r=await build_recommendation_graph(Data(),Classifier()).ainvoke({'requirement':'Property dispute'})
    assert [x['score'] for x in r['recommendations']]==[70,0]
    assert all(0 <= x['score'] <= 100 for x in r['recommendations'])

def test_TC_C113_mock_timeout_returns_safe_503_then_health_recovers():
    graph=type('Graph',(),{'ainvoke':AsyncMock(side_effect=TimeoutError('synthetic private provider detail'))})()
    with patch.dict(os.environ, {'AI_INTERNAL_KEY':'qmse-test-key','GEMINI_API_KEY':''}), patch('lawyer_recommendation.app.build_recommendation_graph', return_value=graph):
        with TestClient(app) as client:
            r=client.post('/lawyer-recommendations',headers={'x-internal-key':'qmse-test-key'},json={'requirement':'Property dispute'})
            assert r.status_code==503
            assert 'synthetic private provider detail' not in r.text
            assert client.get('/health').status_code==200
