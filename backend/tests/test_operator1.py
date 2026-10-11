import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert "version" in data

@pytest.mark.asyncio
async def test_i18n_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        for lang in ["en", "hi", "mr"]:
            res = await client.get(f"/api/v1/i18n/{lang}")
            assert res.status_code == 200
            data = res.json()
            assert "app_name" in data
            assert "discover_title" in data

@pytest.mark.asyncio
async def test_discover_suggest():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "answers": {
                "interests": ["agri_allied", "dairy"],
                "budget_min": 20000,
                "budget_max": 80000,
                "time_commitment": "full",
                "skills": ["animal_care"],
                "space_available": "shed",
                "location_type": "village",
                "electricity": True,
                "water": True
            },
            "lang": "en"
        }
        res = await client.post("/api/v1/discover/suggest", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "suggestions" in data

@pytest.mark.asyncio
async def test_idea_normalize():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "raw_input": "I want to start a 4 cow dairy farm in my village",
            "lang": "en"
        }
        res = await client.post("/api/v1/idea/normalize", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "business_type" in data
        assert "scale" in data

@pytest.mark.asyncio
async def test_local_analysis():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "district": "Nashik",
            "business_type": "dairy_small",
            "lang": "en"
        }
        res = await client.post("/api/v1/analysis/local", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "demand_summary" in data
        assert "risks" in data

@pytest.mark.asyncio
async def test_documents_checklist():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "business_type": "dairy_small",
            "profile": {
                "state": "Maharashtra",
                "district": "Nashik",
                "capital": 50000,
                "category": "obc",
                "gender": "f",
                "age": 34,
                "experience": "some",
                "first_time_borrower": True
            },
            "lang": "en"
        }
        res = await client.post("/api/v1/documents/checklist", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "registration" in data or "additional_notes" in data

@pytest.mark.asyncio
async def test_compare_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "ideas": [
                {"business_type": "dairy_small", "scale": "small"},
                {"business_type": "kirana_store", "scale": "small"}
            ],
            "profile": {
                "state": "Maharashtra",
                "district": "Nashik",
                "capital": 50000,
                "category": "obc",
                "gender": "f",
                "age": 34,
                "experience": "some",
                "first_time_borrower": True
            },
            "lang": "en"
        }
        res = await client.post("/api/v1/compare", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "best_fit_id" in data

@pytest.mark.asyncio
async def test_report_generate_and_fetch():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "profile": {
                "state": "Maharashtra",
                "district": "Nashik",
                "capital": 50000,
                "category": "obc",
                "gender": "f",
                "age": 34,
                "experience": "some",
                "first_time_borrower": True
            },
            "idea": {
                "business_type": "dairy_small",
                "scale": "small",
                "products": ["cow_milk"],
                "target_customer": "local_dairy_cooperative"
            },
            "loan_amount": 200000,
            "loan_rate": 10.5,
            "loan_tenure_months": 60,
            "moratorium_months": 3,
            "lang": "en"
        }
        res = await client.post("/api/v1/report/generate", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "report_id" in data
        assert "investment" in data
        assert "gap" in data
        assert "schemes" in data
        assert "projection" in data
        assert "score" in data
        assert "narrative" in data
        report_id = data["report_id"]
        sid = res.headers.get("x-session-id")

        # Test retrieval with same session
        get_res = await client.get(f"/api/v1/report/{report_id}", headers={"x-session-id": sid} if sid else {})
        assert get_res.status_code == 200
        get_data = get_res.json()
        assert get_data["report_id"] == report_id

