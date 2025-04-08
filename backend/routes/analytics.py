from datetime import datetime
from flask import Blueprint, request, jsonify
from extensions import db
from models import JobApplication, JobStatusHistory, Feedback, FeedbackCategory
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func, text

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard():
    """
    Returns overall metrics for the current user:
      - Total number of job applications.
      - Breakdown of applications by final status.
    """
    current_user_id = get_jwt_identity()
    total = db.session.query(func.count(JobApplication.id)).filter(
        JobApplication.user_id == current_user_id
    ).scalar()

    status_counts = db.session.query(
        JobApplication.status, func.count(JobApplication.id)
    ).filter(
        JobApplication.user_id == current_user_id
    ).group_by(JobApplication.status).all()

    counts = {status: count for status, count in status_counts}

    return jsonify({
        "total_applications": total,
        "status_counts": counts
    }), 200

@analytics_bp.route('/status-trends', methods=['GET'])
@jwt_required()
def get_status_trends():
    """
    Returns aggregated status trends over time.
    We group by status and status_date (for statuses other than "applied")
    and return the number of job applications that transitioned on that date.
    The returned object includes a 'count' property for each day.
    """
    current_user_id = get_jwt_identity()
    trends = db.session.query(
        JobStatusHistory.status,
        JobStatusHistory.status_date,
        func.count(func.distinct(JobStatusHistory.job_id)).label("count")
    ).join(JobApplication, JobApplication.id == JobStatusHistory.job_id)\
     .filter(JobApplication.user_id == current_user_id)\
     .group_by(JobStatusHistory.status, JobStatusHistory.status_date)\
     .order_by(JobStatusHistory.status_date.asc()).all()

    trend_list = []
    for status, status_date, count in trends:
        trend_list.append({
            "status": status,
            "status_date": status_date.isoformat() if status_date else None,
            "count": count
        })
    return jsonify(trend_list), 200

@analytics_bp.route('/feedback-insights', methods=['GET'])
@jwt_required()
def get_feedback_insights():
    """
    Returns aggregated feedback insights for the current user.
    For example, it groups feedback records by the feedback category type.
    """
    current_user_id = get_jwt_identity()
    query = text("""
        SELECT fc.type, COUNT(*) as count
        FROM feedback f
        JOIN feedback_category fc ON f.category_id = fc.id
        JOIN job_application ja ON f.job_id = ja.id
        WHERE ja.user_id = :user_id
        GROUP BY fc.type
    """)
    result = db.session.execute(query, {"user_id": current_user_id}).fetchall()
    feedback_counts = {row[0]: row[1] for row in result}

    return jsonify({"feedback_counts": feedback_counts}), 200
