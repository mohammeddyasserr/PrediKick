from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_get_team_logos_returns_all_teams():
    response = client.get('/matches/logos')

    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)
    assert len(payload) >= 20
    assert payload[0]['team_id'] in {1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20}
    assert 'logo_url' in payload[0]
    assert 'teams-logos/' in payload[0]['logo_url']
