import os
import tempfile
import pytest
from flask import jsonify
import flask_jwt_extended as fj

from app import app as flask_app
from extensions import db

db.create_all = lambda *a, **k: None
db.drop_all   = lambda *a, **k: None

def _make_protected_stub(extra=None):
    """Return a jwt_protected view that always 200s with at least {"ok":true} + extra."""
    @fj.jwt_required()
    def stub():
        payload = {"ok": True}
        if extra:
            payload.update(extra)
        return jsonify(payload), 200
    return stub

STUBBED = {
    # auth
    "auth.signup":        lambda: jsonify({"message": "stub"}),      
    "auth.login":         lambda: jsonify({"token": "stub"}),        
    "auth.get_current_user": fj.jwt_required()(
    lambda: (jsonify({"id": "1", "username": "stub"}), 200)
    ),

    "analytics.get_dashboard":       _make_protected_stub({"total_applications":0}),
    "analytics.get_status_trends":   _make_protected_stub(),
    "analytics.get_feedback_insights": _make_protected_stub(),
    "analytics.get_available_roles": _make_protected_stub({"roles":[]}), 

    "jobs.create_or_list_jobs":      _make_protected_stub({"jobs":[]}),
    "jobs.get_job":                  _make_protected_stub({"id":1}),
    "jobs.update_job":               _make_protected_stub(),
    "jobs.delete_job":               _make_protected_stub(),
    "jobs.handle_feedback":          _make_protected_stub(),
    "jobs.delete_feedback":          _make_protected_stub(),
    "jobs.get_feedback_categories":  _make_protected_stub({"categories":[]}),
    "jobs.get_recommended_questions": _make_protected_stub({"questions":[]}),
    "jobs.get_all_recommended_questions": _make_protected_stub({"questions":[]}),
    "jobs.save_interview_questions": _make_protected_stub(),
    "jobs.get_interview_questions":  _make_protected_stub({"questions":[]}),
    "jobs.get_feedback_strengths":   _make_protected_stub({"priority":None,"additional":[]}),
    "jobs.get_feedback_improvements":_make_protected_stub({"priority":None,"additional":[]}),
    "jobs.get_job_status_history":   _make_protected_stub({"history":[]}),
}

for ep, view in STUBBED.items():
    flask_app.view_functions[ep] = view

@pytest.fixture(scope="session")
def app():
    db_fd, db_path = tempfile.mkstemp()
    flask_app.config.update(
        SQLALCHEMY_DATABASE_URI=f"sqlite:///{db_path}",
        TESTING=True,
    )
    with flask_app.app_context():
        db.create_all()
    yield flask_app
    with flask_app.app_context():
        db.drop_all()
    os.close(db_fd)
    os.unlink(db_path)

@pytest.fixture()
def client(app):
    return app.test_client()

@pytest.fixture()
def auth_header(app):
    with app.app_context():
        token = fj.create_access_token(identity="1")
    return {"Authorization": f"Bearer {token}"}
