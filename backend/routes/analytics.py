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
    total = db.session.query(func.count(JobApplication.id))\
        .filter(JobApplication.user_id == current_user_id).scalar()

    status_counts = db.session.query(
        JobApplication.status, func.count(JobApplication.id)
    ).filter(
        JobApplication.user_id == current_user_id
    ).group_by(JobApplication.status).all()

    counts = {status: count for status, count in status_counts}

    print("DEBUG: Dashboard – Total applications:", total)
    print("DEBUG: Dashboard – Status counts:", counts)

    return jsonify({
        "total_applications": total,
        "status_counts": counts
    }), 200

@analytics_bp.route('/status-trends', methods=['GET'])
@jwt_required()
def get_status_trends():
    """
    Returns aggregated status trends over time.
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
        print(f"DEBUG: Status trend – {status} on {status_date}: {count}")

    return jsonify(trend_list), 200

@analytics_bp.route('/feedback-insights', methods=['GET'])
@jwt_required()
def get_feedback_insights():
    """
    Returns aggregated feedback insights for the current user,
    optionally filtered by a role_category if provided in ?role=...
    """
    current_user_id = get_jwt_identity()
    role = request.args.get('role', None)

    where_clause = "ja.user_id = :user_id"
    params = {"user_id": current_user_id}
    if role:
        where_clause += " AND ja.role_category = :role"
        params["role"] = role

    query1 = text(f"""
        SELECT fc.type, COUNT(*) as count
        FROM feedback f
        JOIN feedback_category fc ON f.category_id = fc.id
        JOIN job_application ja ON f.job_id = ja.id
        WHERE {where_clause}
        GROUP BY fc.type
    """)
    result1 = db.session.execute(query1, params).fetchall()
    feedback_counts = {row[0]: row[1] for row in result1}
    print("DEBUG: Feedback counts by category:", feedback_counts)

    query2 = text(f"""
        SELECT fs.strength, COUNT(*) as count
        FROM feedback_strength fs
        JOIN feedback f ON fs.feedback_id = f.id
        JOIN job_application ja ON f.job_id = ja.id
        WHERE {where_clause}
        GROUP BY fs.strength
        ORDER BY count DESC
        LIMIT 5
    """)
    result2 = db.session.execute(query2, params).fetchall()
    top_strengths = [{"strength": row[0], "count": row[1]} for row in result2]
    print("DEBUG: Top strengths:", top_strengths)

    query3 = text(f"""
        SELECT fi.improvement, COUNT(*) as count
        FROM feedback_improvement fi
        JOIN feedback f ON fi.feedback_id = f.id
        JOIN job_application ja ON f.job_id = ja.id
        WHERE {where_clause}
        GROUP BY fi.improvement
        ORDER BY count DESC
        LIMIT 5
    """)
    result3 = db.session.execute(query3, params).fetchall()
    top_improvements = [{"improvement": row[0], "count": row[1]} for row in result3]
    print("DEBUG: Top improvements:", top_improvements)

    query4 = text(f"""
        SELECT ja.job_title, ja.company, f.notes, f.detailed_feedback, ja.status, f.created_at
        FROM feedback f
        JOIN job_application ja ON f.job_id = ja.id
        WHERE {where_clause}
          AND f.notes REGEXP '^[A-Za-z]'
        ORDER BY f.created_at DESC
    """)
    result4 = db.session.execute(query4, params).fetchall()
    detailed_feedback = [{
        "job_title": row[0],
        "company": row[1],
        "notes": row[2],
        "detailed_feedback": row[3],
        "status": row[4],
        "created_at": row[5].isoformat() if row[5] else None
    } for row in result4]
    print("DEBUG: Number of detailed feedback entries:", len(detailed_feedback))

    recommendations = []
    if top_improvements:
        top_improve = top_improvements[0]["improvement"].lower()
        if "communication" in top_improve:
            recommendations.append(
                "Your feedback suggests improving communication skills—consider a public speaking course or Toastmasters."
            )
        elif "time" in top_improve:
            recommendations.append(
                "Time management was flagged—try scheduling tools or time-management workshops."
            )
        elif "technical" in top_improve:
            recommendations.append(
                "Enhance technical skills via advanced courses, projects, or mentorship."
            )
        elif "leadership" in top_improve:
            recommendations.append(
                "Leadership training or mentorship could strengthen your leadership capabilities."
            )
        else:
            recommendations.append(
                "Review recurring feedback themes and pursue targeted training or mentoring."
            )
    else:
        recommendations.append("No common improvement areas identified.")

    return jsonify({
        "feedback_counts": feedback_counts,
        "top_strengths": top_strengths,
        "top_improvements": top_improvements,
        "detailed_feedback": detailed_feedback,
        "recommendations": recommendations
    }), 200

@analytics_bp.route('/available-roles', methods=['GET'])
@jwt_required()
def get_available_roles():
    """
    Returns the distinct role_category values for the current user.
    """
    current_user_id = get_jwt_identity()
    query = text("""
      SELECT DISTINCT role_category
      FROM job_application
      WHERE user_id = :user_id
        AND role_category IS NOT NULL
        AND role_category <> ''
    """)
    results = db.session.execute(query, {"user_id": current_user_id}).fetchall()
    roles = [row[0] for row in results]
    print("DEBUG: Available roles for user:", roles)
    return jsonify(roles), 200