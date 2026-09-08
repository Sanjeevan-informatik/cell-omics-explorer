from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_endpoint():
    assert client.get("/health").json()["status"] == "ok"


def test_analysis_endpoint():
    response = client.post(
        "/api/v1/analyze",
        json={"fasta": ">a\nACGT\n>b\nAGGT\n", "model": "jc69"},
    )
    assert response.status_code == 200
    assert response.json()["variants"][0]["position"] == 2


def test_analysis_endpoint_reports_invalid_alignment():
    response = client.post(
        "/api/v1/analyze",
        json={"fasta": ">a\nACGT\n>b\nACG\n", "model": "jc69"},
    )
    assert response.status_code == 422
    assert "same length" in response.json()["detail"]


def test_oversized_request_is_rejected():
    response = client.post("/api/v1/analyze", json={"fasta": "A" * 2_000_001})
    assert response.status_code == 422
    assert response.json()["detail"][0]["type"] == "string_too_long"
