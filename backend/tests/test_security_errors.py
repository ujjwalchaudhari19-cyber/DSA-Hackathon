import uuid, pytest
from fastapi import FastAPI, Request, Header, Response
from fastapi.testclient import TestClient
from pydantic import BaseModel, Field
from typing import Literal
from app.errors import install, NotFound
from app.security import session_id, assert_owner, sse_response

app = FastAPI()
install(app)
REPORTS = {}

class Profile(BaseModel):
    capital: float = Field(ge=0, le=1e8)
    age: int = Field(ge=18, le=80)
    lang: Literal["en", "hi", "mr"] = "en"

@app.post("/p")
def p(x: Profile):
    return x

@app.post("/report")
def create(response: Response, x_session_id: str | None = Header(default=None)):
    sid = session_id(x_session_id) or str(uuid.uuid4())
    rid = str(uuid.uuid4())
    REPORTS[rid] = {"owner": sid}
    response.headers["x-session-id"] = sid
    return {"id": rid, "session_id": sid}

@app.get("/report/{rid}")
def get(rid: str, x_session_id: str | None = Header(default=None)):
    assert_owner(REPORTS.get(rid), session_id(x_session_id))
    return {"ok": True}

@app.get("/boom")
def boom():
    raise RuntimeError("x")

@app.get("/chat")
async def chat(request: Request):
    async def gen():
        for t in "abc":
            if await request.is_disconnected():
                return
            yield f"data: {t}\n\n"
        yield "event: done\ndata: {}\n\n"
    return sse_response(gen())

c = TestClient(app, raise_server_exceptions=False)

def test_validation_shape():
    j = c.post("/p", json={"capital": -5, "age": 10, "lang": "fr"}).json()["error"]
    assert j["code"] == "VALIDATION_FAILED" and {f["field"] for f in j["details"]["fields"]} == {"capital", "age", "lang"}

def test_unhandled_is_500_with_request_id():
    r = c.get("/boom")
    assert r.status_code == 500 and r.json()["error"]["code"] == "INTERNAL_ERROR" and r.headers["x-request-id"]

def test_report_is_session_bound():
    a = c.post("/report").json()
    assert c.get(f"/report/{a['id']}", headers={"x-session-id": a["session_id"]}).status_code == 200
    assert c.get(f"/report/{a['id']}", headers={"x-session-id": str(uuid.uuid4())}).status_code == 404
    assert c.get(f"/report/{a['id']}").status_code == 404 and c.get("/report/nope").status_code == 404

def test_sse_headers():
    r = c.get("/chat")
    assert r.headers["x-accel-buffering"] == "no" and r.text.count("data:") == 4

