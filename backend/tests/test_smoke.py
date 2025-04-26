# tests/test_smoke.py

import pytest

# --- AUTH -----------------------------------------------------------------

def test_signup_route(client):
    # GET not allowed
    r = client.get("/api/auth/signup")
    assert r.status_code == 405

    # POST → stub
    r = client.post("/api/auth/signup",
                    json={"username":"u","email":"e@e.com","password":"p"})
    assert r.status_code == 200
    assert r.get_json()["message"] == "stub"

def test_login_route(client):
    r = client.get("/api/auth/login")
    assert r.status_code == 405

    r = client.post("/api/auth/login",
                    json={"username_or_email":"u","password":"p"})
    assert r.status_code == 200
    assert "token" in r.get_json()

def test_current_user_protected(client):
    r = client.get("/api/auth/current-user")
    assert r.status_code == 401

def test_current_user_auth(client, auth_header):
    r = client.get("/api/auth/current-user", headers=auth_header)
    assert r.status_code == 200
    j = r.get_json()
    assert j["id"] == "1" and "username" in j

# --- ANALYTICS ------------------------------------------------------------

ANALYTICS = [
    ("/api/analytics/dashboard",       "total_applications"),
    ("/api/analytics/status-trends",   None),
    ("/api/analytics/feedback-insights", None),
    ("/api/analytics/available-roles", None),
]

@pytest.mark.parametrize("path,key", ANALYTICS)
def test_analytics_unauth(path, key, client):
    r = client.get(path)
    assert r.status_code in (401, 405)

@pytest.mark.parametrize("path,key", ANALYTICS)
def test_analytics_auth(path, key, client, auth_header):
    r = client.get(path, headers=auth_header)
    assert r.status_code in (200, 405)
    if r.status_code == 200:
        j = r.get_json()
        assert j.get("ok") is True
        if key:
            assert key in j

# --- JOBS -----------------------------------------------------------------

JOB_PATHS = [
    ("/api/jobs",                     "GET"),
    ("/api/jobs",                     "POST"),
    ("/api/jobs/feedback-categories", "GET"),
    ("/api/jobs/recommended-questions","GET"),
]

@pytest.mark.parametrize("path,method", JOB_PATHS)
def test_jobs_unauth(path, method, client):
    fn = getattr(client, method.lower())
    kwargs = {"json": {}} if method in ("POST",) else {}
    r = fn(path, **kwargs)
    assert r.status_code in (401, 405)

@pytest.mark.parametrize("path,method", JOB_PATHS)
def test_jobs_auth(path, method, client, auth_header):
    fn = getattr(client, method.lower())
    kwargs = {"headers": auth_header}
    if method in ("POST",):
        kwargs["json"] = {}
    r = fn(path, **kwargs)
    assert r.status_code in (200, 405)
    if r.status_code == 200:
        assert r.get_json().get("ok") is True
