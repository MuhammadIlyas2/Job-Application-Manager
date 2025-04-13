from datetime import datetime
from flask import Blueprint, request, jsonify
from extensions import db
from models import JobApplication, JobStatusHistory, Feedback, FeedbackCategory
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func, text

analytics_bp = Blueprint('analytics', __name__)

# --------------------- Utility: Update Feedback Extras ---------------------
def update_feedback_extras(feedback_id, extras, table_name):
    """
    Delete all current rows for the given feedback_id in the specified table,
    then insert new rows from the extras dict.
    'extras' is expected to be a dict with keys "priority" (string) and "additional" (list of strings).
    'table_name' should be either "feedback_strength" or "feedback_improvement".
    """
    if table_name == "feedback_strength":
        column_name = "strength"
    elif table_name == "feedback_improvement":
        column_name = "improvement"
    else:
        raise ValueError("Invalid table name: must be 'feedback_strength' or 'feedback_improvement'")

    # Delete existing entries for this feedback
    delete_query = text(f"DELETE FROM {table_name} WHERE feedback_id = :feedback_id")
    db.session.execute(delete_query, {"feedback_id": feedback_id})

    # Prepare the insert query. 'is_priority' marks the priority row.
    insert_query = text(f"""
        INSERT INTO {table_name} (feedback_id, is_priority, {column_name})
        VALUES (:feedback_id, :is_priority, :value)
    """)

    # Insert priority item (if provided)
    if extras.get("priority"):
        priority_value = extras["priority"].strip()
        if priority_value:
            db.session.execute(insert_query, {
                "feedback_id": feedback_id,
                "is_priority": 1,
                "value": priority_value
            })

    # Insert each additional item (if any)
    additional = extras.get("additional", [])
    for s in additional:
        s = s.strip()
        if s:
            db.session.execute(insert_query, {
                "feedback_id": feedback_id,
                "is_priority": 0,
                "value": s
            })


# --------------------- Routes ---------------------

@analytics_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard():
    """
    Returns overall metrics for the current user:
      - Total number of job applications.
      - Breakdown of applications by final status.
    """
    current_user_id = get_jwt_identity()

    total = db.session.query(func.count(JobApplication.id)) \
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
    Groups by status and status_date (for statuses other than "applied")
    and returns the number of distinct job applications that transitioned on that day.
    """
    current_user_id = get_jwt_identity()

    trends = db.session.query(
        JobStatusHistory.status,
        JobStatusHistory.status_date,
        func.count(func.distinct(JobStatusHistory.job_id)).label("count")
    ).join(JobApplication, JobApplication.id == JobStatusHistory.job_id) \
     .filter(JobApplication.user_id == current_user_id) \
     .group_by(JobStatusHistory.status, JobStatusHistory.status_date) \
     .order_by(JobStatusHistory.status_date.asc()).all()

    trend_list = []
    for status, status_date, count in trends:
        print(f"DEBUG: Status trend – {status} on {status_date}: {count}")
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
    The response includes:
      1. feedback_counts: Aggregated counts by feedback category type.
      2. top_strengths: Top 5 strengths aggregated from feedback.
      3. top_improvements: Top 5 improvements aggregated from feedback.
      4. detailed_feedback: A list of detailed feedback entries (only those where the note starts with an alphabet letter).
      5. recommendations: A simple set of suggestions based on the top improvement.
    """
    current_user_id = get_jwt_identity()
    
    # 1. Aggregated feedback counts by category type:
    query1 = text("""
        SELECT fc.type, COUNT(*) as count
        FROM feedback f
        JOIN feedback_category fc ON f.category_id = fc.id
        JOIN job_application ja ON f.job_id = ja.id
        WHERE ja.user_id = :user_id
        GROUP BY fc.type
    """)
    result1 = db.session.execute(query1, {"user_id": current_user_id}).fetchall()
    feedback_counts = {row[0]: row[1] for row in result1}
    print("DEBUG: Feedback counts by category:", feedback_counts)

    # 2. Top strengths aggregated from feedback_strength table
    query2 = text("""
        SELECT fs.strength, COUNT(*) as count
        FROM feedback_strength fs
        JOIN feedback f ON fs.feedback_id = f.id
        JOIN job_application ja ON f.job_id = ja.id
        WHERE ja.user_id = :user_id
        GROUP BY fs.strength
        ORDER BY count DESC
        LIMIT 5
    """)
    result2 = db.session.execute(query2, {"user_id": current_user_id}).fetchall()
    top_strengths = [{"strength": row[0], "count": row[1]} for row in result2]
    print("DEBUG: Top strengths:", top_strengths)

    # 3. Top improvements aggregated from feedback_improvement table
    query3 = text("""
        SELECT fi.improvement, COUNT(*) as count
        FROM feedback_improvement fi
        JOIN feedback f ON fi.feedback_id = f.id
        JOIN job_application ja ON f.job_id = ja.id
        WHERE ja.user_id = :user_id
        GROUP BY fi.improvement
        ORDER BY count DESC
        LIMIT 5
    """)
    result3 = db.session.execute(query3, {"user_id": current_user_id}).fetchall()
    top_improvements = [{"improvement": row[0], "count": row[1]} for row in result3]
    print("DEBUG: Top improvements:", top_improvements)

    # 4. Detailed feedback entries, filtering to only include those feedback entries where the notes start with an alphabet letter.
    query4 = text("""
        SELECT ja.job_title, ja.company, f.notes, f.detailed_feedback, ja.status, f.created_at
        FROM feedback f
        JOIN job_application ja ON f.job_id = ja.id
        WHERE ja.user_id = :user_id
          AND f.notes REGEXP '^[A-Za-z]'
        ORDER BY f.created_at DESC
    """)
    result4 = db.session.execute(query4, {"user_id": current_user_id}).fetchall()
    detailed_feedback = [{
        "job_title": row[0],
        "company": row[1],
        "notes": row[2],
        "detailed_feedback": row[3],
        "status": row[4],
        "created_at": row[5].isoformat() if row[5] else None
    } for row in result4]
    print("DEBUG: Number of detailed feedback entries:", len(detailed_feedback))

    # 5. Generate simple recommendations based on the top improvements.
    recommendations = []
    if top_improvements:
        top_improve = top_improvements[0].get("improvement", "").lower()
        # Expanded simple rules for suggestions:
        if "communication" in top_improve:
            recommendations.append(
                "The feedback indicates a need to improve your communication skills. "
                "Consider joining a public speaking club (such as Toastmasters), enrolling in a specialized workshop, or engaging in group discussions to enhance your interpersonal skills."
            )
        elif "time" in top_improve:
            recommendations.append(
                "Feedback suggests you could benefit from better time management. "
                "Look into time management training resources, use productivity tools (like planners or apps), and adopt scheduling techniques to better organize your work."
            )
        elif "technical" in top_improve:
            recommendations.append(
                "It appears there is room to improve technical skills. "
                "Consider attending advanced courses, participating in coding challenges, or seeking mentorship to bridge gaps in your technical expertise."
            )
        elif "leadership" in top_improve:
            recommendations.append(
                "The feedback highlights a need to strengthen your leadership skills. "
                "Explore leadership training, consider mentorship opportunities, and read literature on team management and decision-making."
            )
        else:
            recommendations.append(
                "Review your feedback for recurring themes and consider targeted self-improvement. "
                "This might involve further training, practice, or seeking guidance from peers or mentors in the identified areas."
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
