from math import ceil
from flask import Blueprint, request, jsonify
from extensions import db
from models import JobApplication, User, FeedbackCategory  # ✅ Import necessary models
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

      # ✅ Create JobApplication (without feedback)
      job = JobApplication(
            user_id=current_user_id,
            job_title=data['job_title'],
            company=data['company'],
            role_category=data.get('role_category'),
            status=data.get('status', 'applied'),
            general_notes=data.get('general_notes')  # Add this line
        )

      try:
          db.session.add(job)
          db.session.commit()

          # ✅ If feedback is provided, insert it separately
          if 'feedback' in data and data['feedback']:
            insert_feedback_query = text("""
                INSERT INTO feedback (job_id, notes, category_id) 
                VALUES (:job_id, :notes, :category_id);
            """)
            db.session.execute(insert_feedback_query, {
                "job_id": job.id,
                "notes": data['feedback'].get('notes', ''),
                "category_id": data['feedback'].get('category_id', None)
            })
            db.session.commit()

          return jsonify({'message': 'Job application added', 'job': job.serialize()}), 201

      except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

    elif request.method == 'GET':
        """List jobs for the logged-in user with pagination metadata"""
        try:
            current_user_id = get_jwt_identity()
            page = request.args.get('page', default=1, type=int)
            limit = request.args.get('limit', default=5, type=int)
            offset = (page - 1) * limit

            # Query to get total number of jobs for the user
            count_query = text("SELECT COUNT(*) FROM job_application WHERE user_id = :user_id")
            total_jobs = db.session.execute(count_query, {"user_id": current_user_id}).scalar()
            total_pages = ceil(total_jobs / limit) if limit else 1

            # Existing query to fetch paginated jobs with feedback
            query = text("""
                SELECT 
                    ja.id, ja.job_title, ja.company, ja.status, ja.general_notes, ja.applied_date,
                    COALESCE(f.notes, 'No feedback yet') AS feedback
                FROM job_application ja
                LEFT JOIN feedback f ON ja.id = f.job_id
                WHERE ja.user_id = :user_id
                ORDER BY ja.applied_date DESC
                LIMIT :limit OFFSET :offset;
            """)

            results = db.session.execute(query, {
                "user_id": current_user_id,
                "limit": limit,
                "offset": offset
            }).fetchall()

            job_list = [{
                "id": row[0],
                "job_title": row[1],
                "company": row[2],
                "status": row[3],
                "general_notes": row[4],
                "applied_date": row[5].strftime("%Y-%m-%d") if row[5] else None,
                "feedback": row[6]
            } for row in results]

            return jsonify({
              "jobs": job_list,
              "totalPages": total_pages,  # Changed from total_pages
              "totalJobs": total_jobs,    # Changed from total_jobs
              "currentPage": page
}), 200

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
    """Create or update feedback for a job application and sync general_notes."""
    try:
        data = request.get_json()

        # ✅ Check if job exists and get status
        job_check_query = text("SELECT id, status FROM job_application WHERE id = :job_id")
        job = db.session.execute(job_check_query, {"job_id": job_id}).fetchone()
        if not job:
            return jsonify({"message": "Job not found"}), 404

        # ✅ Default category_id to "No Feedback" (ID = 100) if missing
        if not data.get("category_id"):
            if job.status in ["applied", "interview"]:  
                data["category_id"] = 100  

        # ✅ Determine `key_feedback` based on status
        key_improvements = None
        key_strengths = None

        if job.status == "rejected":
            key_improvements = data.get("key_improvements", None)
        elif job.status in ["accepted", "offer"]:
            key_strengths = data.get("key_strengths", None)

        # ✅ Combine feedback into `general_notes`
        general_notes = "\n\n".join(filter(None, [
            data.get("notes", ""),
            data.get("detailed_feedback", ""),
            f"Key Improvements: {key_improvements}" if key_improvements else None,
            f"Key Strengths: {key_strengths}" if key_strengths else None
        ])).strip()

        # ✅ Check if feedback already exists
        feedback_check_query = text("SELECT id FROM feedback WHERE job_id = :job_id")
        feedback_exists = db.session.execute(feedback_check_query, {"job_id": job_id}).fetchone()

        if request.method == 'POST':
            if feedback_exists:
                return jsonify({"message": "Feedback already exists for this job"}), 400

            insert_query = text("""
            INSERT INTO feedback (job_id, category_id, notes, detailed_feedback, key_improvements, key_strengths)
            VALUES (:job_id, :category_id, :notes, :detailed_feedback, :key_improvements, :key_strengths);
            """)
            db.session.execute(insert_query, {
                "job_id": job_id,
                "category_id": data["category_id"],
                "notes": data.get("notes", ""),
                "detailed_feedback": data.get("detailed_feedback", ""),
                "key_improvements": key_improvements,
                "key_strengths": key_strengths
            })

        elif request.method == 'PUT':
            if not feedback_exists:
                return jsonify({"message": "Feedback not found"}), 404

            update_query = text("""
            UPDATE feedback
            SET category_id = :category_id, notes = :notes, detailed_feedback = :detailed_feedback, 
                key_improvements = :key_improvements, key_strengths = :key_strengths
            WHERE job_id = :job_id;
            """)
            db.session.execute(update_query, {
                "job_id": job_id,
                "category_id": data["category_id"],
                "notes": data.get("notes", ""),
                "detailed_feedback": data.get("detailed_feedback", ""),
                "key_improvements": key_improvements,
                "key_strengths": key_strengths
            })

        db.session.commit()
        return jsonify({"message": "Feedback saved successfully and job updated"}), 200

    except Exception as e:
        db.session.rollback()
        print(f"❌ ERROR in `handle_feedback`: {str(e)}")
        return jsonify({"error": str(e)}), 500

@jobs_bp.route('/jobs/<int:job_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@jwt_required()
def delete_job(job_id):
    """Delete a job application and its associated feedback"""
    if request.method == "OPTIONS":
        return jsonify({'message': 'CORS preflight successful'}), 200

    try:
        current_user_id = get_jwt_identity()
        
        # Delete job only if it belongs to the current user
        delete_query = text("""
            DELETE FROM job_application 
            WHERE id = :job_id 
            AND user_id = :user_id
        """)
        result = db.session.execute(delete_query, {
            "job_id": job_id,
            "user_id": current_user_id
        })

        if result.rowcount == 0:
            return jsonify({
                "message": "Job not found or unauthorized"
            }), 404

        db.session.commit()
        return jsonify({"message": "Job deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        print(f"❌ ERROR deleting job: {str(e)}")
        return jsonify({"error": str(e)}), 500
    
@jobs_bp.route('/feedback-categories', methods=['GET'])
@jwt_required()
def get_feedback_categories():
    try:
        categories = FeedbackCategory.query.all()
        return jsonify([c.serialize() for c in categories]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500