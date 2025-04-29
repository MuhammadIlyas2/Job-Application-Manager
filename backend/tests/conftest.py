import os
import tempfile
import pytest
from flask import jsonify
import flask_jwt_extended as fj
from flask_jwt_extended import verify_jwt_in_request

from app import app as flask_app
from extensions import db

db.create_all = lambda *a, **k: None
db.drop_all   = lambda *a, **k: None

def _make_protected_stub(extra=None):
    """
    Return a view function which:
     - accepts **only** keyword path parameters,
     - enforces JWT auth,
     - returns {"ok": True, **extra} as JSON.
    """
    def stub(**kwargs):
        verify_jwt_in_request()
        payload = {"ok": True}
        if extra:
            payload.update(extra)
        return jsonify(payload), 200
    return stub

STUBBED = {
    "auth.signup":           lambda **k: jsonify({"message": "stub"}),
    "auth.login":            lambda **k: jsonify({"token":   "stub"}),
    "auth.get_current_user": fj.jwt_required()(lambda **k: (jsonify({"id":"1","username":"stub"}), 200)),

    "analytics.get_dashboard":         _make_protected_stub({"total_applications": 0}),
    "analytics.get_status_trends":     _make_protected_stub(),
    "analytics.get_feedback_insights": _make_protected_stub(),
    "analytics.get_available_roles":   _make_protected_stub({"roles": []}),

    "jobs.create_or_list_jobs":           _make_protected_stub({"jobs": []}),
    "jobs.get_job":                       _make_protected_stub({"id": 1}),              # return id=1 now
    "jobs.update_job":                    _make_protected_stub(),
    "jobs.delete_job":                    _make_protected_stub(),
    "jobs.handle_feedback":               _make_protected_stub(),
    "jobs.delete_feedback":               _make_protected_stub(),
    "jobs.get_feedback_categories":       _make_protected_stub({"categories": []}),
    "jobs.get_recommended_questions":     _make_protected_stub({"questions": []}),
    "jobs.get_all_recommended_questions": _make_protected_stub({"questions": []}),
    "jobs.save_interview_questions":      _make_protected_stub(),
    "jobs.get_interview_questions":       _make_protected_stub({"questions": []}),
    "jobs.get_feedback_strengths":        _make_protected_stub({"priority": None, "additional": []}),
    "jobs.get_feedback_improvements":     _make_protected_stub({"priority": None, "additional": []}),
    "jobs.get_job_status_history":        _make_protected_stub({"history": []}),
}

for endpoint, view in STUBBED.items():
    flask_app.view_functions[endpoint] = view

@pytest.fixture(scope="session")
def app():
    fd, path = tempfile.mkstemp()
    flask_app.config.update(
        SQLALCHEMY_DATABASE_URI=f"sqlite:///{path}",
        TESTING=True,
    )
    with flask_app.app_context():
        db.create_all()
    yield flask_app
    os.close(fd)
    os.unlink(path)

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def auth_header(app):
    with app.app_context():
        token = fj.create_access_token(identity="1")
    return {"Authorization": f"Bearer {token}"}
