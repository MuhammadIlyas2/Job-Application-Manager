from math import ceil
from flask import Blueprint, request, jsonify
from extensions import db
from models import JobApplication, User  # ✅ Import necessary models
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_cors import cross_origin
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import text

jobs_bp = Blueprint('jobs', __name__)

@jobs_bp.route('', methods=['OPTIONS'])
@jobs_bp.route('/', methods=['OPTIONS'])
@cross_origin()
def options_handler():
    return jsonify({'message': 'CORS preflight successful'}), 200

@jobs_bp.route('', methods=['GET', 'POST'])
@jobs_bp.route('/', methods=['GET', 'POST'])
@jwt_required()
@cross_origin()
def create_or_list_jobs():
    if request.method == 'POST':
        data = request.get_json()
        required_fields = ['job_title', 'company']
        if not all(field in data for field in required_fields):
            return jsonify({'message': 'Missing required fields'}), 400

        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({'message': 'User not found'}), 404

        job = JobApplication(
            user_id=current_user_id,
            job_title=data['job_title'],
            company=data['company'],
            role_category=data.get('role_category'),
            status=data.get('status', 'applied'),
            feedback=data.get('feedback')
        )

        try:
            db.session.add(job)
            db.session.commit()
            return jsonify({'message': 'Job application added', 'job': job.serialize()}), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500

    elif request.method == 'GET':
        """List jobs for the logged-in user"""
        try:
            current_user_id = get_jwt_identity()
            page = request.args.get('page', default=1, type=int)
            limit = request.args.get('limit', default=5, type=int)
            offset = (page - 1) * limit

            print(f"🔍 Fetching jobs for user {current_user_id}, Page: {page}, Limit: {limit}, Offset: {offset}")

            query = text("""
                SELECT 
                    ja.id, ja.job_title, ja.company, ja.status, ja.general_notes, ja.applied_date,
                    COALESCE(f.notes, 'No feedback yet') AS feedback
                FROM job_application ja
                LEFT JOIN feedback f ON ja.id = f.job_id
                WHERE ja.user_id = :user_id
                LIMIT :limit OFFSET :offset;
            """)

            results = db.session.execute(query, {
                "user_id": current_user_id,
                "limit": limit,
                "offset": offset
            }).fetchall()

            print(f"🔍 Query Results Count: {len(results)}")  # Debugging statement

            job_list = [{
                "id": row[0],  
                "job_title": row[1],  
                "company": row[2],  
                "status": row[3],  
                "general_notes": row[4],  
                "applied_date": row[5].strftime("%Y-%m-%d") if row[5] else None,  
                "feedback": row[6]  
            } for row in results]

            return jsonify({"jobs": job_list}), 200

        except Exception as e:
            print(f"❌ ERROR in `create_or_list_jobs`: {str(e)}")
            return jsonify({"error": str(e)}), 500

    return jsonify({'message': 'Invalid request method'}), 405

@jobs_bp.route('/jobs/<int:job_id>', methods=['GET'])
def get_job(job_id):
    """Retrieve a single job application with feedback."""
    try:
        query = text("""
        SELECT 
            ja.id, ja.job_title, ja.company, ja.status, ja.general_notes, ja.applied_date,
            COALESCE(f.notes, 'No feedback yet') AS feedback
        FROM job_application ja
        LEFT JOIN feedback f ON ja.id = f.job_id
        WHERE ja.id = :job_id;
        """)

        result = db.session.execute(query, {"job_id": job_id}).fetchone()

        print(f"🔍 Query Result for Job ID {job_id}: {result}")  # Debugging

        if not result:
            return jsonify({"message": "Job not found"}), 404

        job_data = {
            "id": result[0],  
            "job_title": result[1],  
            "company": result[2],  
            "status": result[3],  
            "general_notes": result[4],  
            "applied_date": result[5].strftime("%Y-%m-%d") if result[5] else None,  
            "feedback": result[6]  
        }

        return jsonify(job_data), 200

    except Exception as e:
        print(f"❌ ERROR in `get_job`: {str(e)}")
        return jsonify({"error": str(e)}), 500

@jobs_bp.route('/jobs/<int:job_id>/feedback', methods=['POST', 'PUT'])
@jwt_required()
def handle_feedback(job_id):
    """Create or update feedback for a job application."""
    try:
        data = request.get_json()

        # ✅ Check if job exists
        job_check_query = text("SELECT id FROM job_application WHERE id = :job_id")
        job_exists = db.session.execute(job_check_query, {"job_id": job_id}).fetchone()
        if not job_exists:
            return jsonify({"message": "Job not found"}), 404

        # ✅ Check if feedback already exists
        feedback_check_query = text("SELECT id FROM feedback WHERE job_id = :job_id")
        feedback_exists = db.session.execute(feedback_check_query, {"job_id": job_id}).fetchone()

        if request.method == 'POST':
            if feedback_exists:
                return jsonify({"message": "Feedback already exists for this job"}), 400

            insert_query = text("""
            INSERT INTO feedback (job_id, category_id, notes)
            VALUES (:job_id, :category_id, :notes);
            """)
            db.session.execute(insert_query, {
                "job_id": job_id,
                "category_id": data["category_id"],
                "notes": data.get("notes", "")
            })

        elif request.method == 'PUT':
            if not feedback_exists:
                return jsonify({"message": "Feedback not found"}), 404

            update_query = text("""
            UPDATE feedback
            SET category_id = :category_id, notes = :notes
            WHERE job_id = :job_id;
            """)
            db.session.execute(update_query, {
                "job_id": job_id,
                "category_id": data["category_id"],
                "notes": data.get("notes", "")
            })

        db.session.commit()
        return jsonify({"message": "Feedback saved successfully"}), 200

    except Exception as e:
        db.session.rollback()
        print(f"❌ ERROR in `handle_feedback`: {str(e)}")
        return jsonify({"error": str(e)}), 500
