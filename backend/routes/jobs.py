from math import ceil
from flask import Blueprint, request, jsonify
from extensions import db
from models import JobApplication, User, FeedbackCategory  # ✅ Import necessary models
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_cors import cross_origin
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import text
from datetime import datetime

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
        
        # ✅ Validate required fields
        if not all(field in data for field in required_fields):
            return jsonify({'message': 'Missing required fields'}), 400

        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        applied_date = datetime.strptime(data['applied_date'], "%Y-%m-%d").date() if data.get('applied_date') else None
        created_at = datetime.utcnow()

        # ✅ Create JobApplication (without feedback)
        job = JobApplication(
            user_id=current_user_id,
            job_title=data['job_title'],
            company=data['company'],
            role_category=data.get('role_category'),
            status=data.get('status', 'applied'),
            applied_date=applied_date,
            created_at=created_at,  
            general_notes=data.get('general_notes')  
        )

        try:
            db.session.add(job)
            db.session.commit()

            # ✅ Insert Full Feedback Data (If Provided)
            if 'feedback' in data and data['feedback']:
                insert_feedback_query = text("""
                    INSERT INTO feedback (job_id, category_id, notes, detailed_feedback, key_improvements, key_strengths)
                    VALUES (:job_id, :category_id, :notes, :detailed_feedback, :key_improvements, :key_strengths);
                """)
                
                db.session.execute(insert_feedback_query, {
                    "job_id": job.id,
                    "category_id": data['feedback'].get('category_id', None),
                    "notes": data['feedback'].get('notes', ''),
                    "detailed_feedback": data['feedback'].get('detailed_feedback', ''),
                    "key_improvements": data['feedback'].get('key_improvements', ''),
                    "key_strengths": data['feedback'].get('key_strengths', '')
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
                ORDER BY ja.created_at DESC, ja.applied_date DESC
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

@jobs_bp.route('/<int:job_id>', methods=['GET'])
def get_job(job_id):
    """Retrieve a single job application with full feedback details, including feedback id."""
    try:
        query = text("""
        SELECT 
            ja.id, 
            ja.job_title, 
            ja.company, 
            ja.status, 
            ja.general_notes, 
            ja.applied_date, 
            ja.created_at, 
            ja.role_category,
            f.id AS feedback_id,
            f.notes, 
            f.detailed_feedback, 
            f.key_improvements, 
            f.key_strengths, 
            f.category_id,
            fc.name AS category_name, 
            fc.type AS category_type
        FROM job_application ja
        LEFT JOIN feedback f ON ja.id = f.job_id
        LEFT JOIN feedback_category fc ON f.category_id = fc.id
        WHERE ja.id = :job_id;
        """)
        
        result = db.session.execute(query, {"job_id": job_id}).fetchone()
        if not result:
            return jsonify({"message": "Job not found"}), 404

        # Format dates safely
        applied_date = result[5]
        created_at = result[6]
        if applied_date and not isinstance(applied_date, str):
            applied_date = applied_date.strftime("%Y-%m-%d")
        if created_at and not isinstance(created_at, str):
            created_at = created_at.strftime("%Y-%m-%d %H:%M:%S")

        job_data = {
            "id": result[0],
            "job_title": result[1],
            "company": result[2],
            "status": result[3],
            "general_notes": result[4],
            "applied_date": applied_date,
            "created_at": created_at,
            "role_category": result[7],
            "feedback": {
                "id": result[8],  # feedback_id
                "notes": result[9] if result[9] is not None else '',
                "detailed_feedback": result[10] if result[10] is not None else '',
                "key_improvements": result[11] if result[11] is not None else '',
                "key_strengths": result[12] if result[12] is not None else '',
                "category_id": result[13],
                "category_name": result[14] if result[14] else "No category",
                "category_type": result[15] if result[15] else "N/A"
            }
        }
        return jsonify(job_data), 200

    except Exception as e:
        print(f"❌ ERROR in `get_job`: {str(e)}")
        return jsonify({"error": str(e)}), 500


@jobs_bp.route('/jobs/<int:job_id>/feedback', methods=['POST', 'PUT'])
@jwt_required()
def handle_feedback(job_id):
    try:
        data = request.get_json()
        print("DEBUG: Received feedback request. Method:", request.method)
        print("DEBUG: Feedback data:", data)

        # Check if job exists and get its status
        job_check_query = text("SELECT id, status FROM job_application WHERE id = :job_id")
        job = db.session.execute(job_check_query, {"job_id": job_id}).fetchone()
        if not job:
            print("DEBUG: Job not found for id:", job_id)
            return jsonify({"message": "Job not found"}), 404

        # Default category_id if missing
        if not data.get("category_id"):
            if job.status in ["applied", "interview"]:
                data["category_id"] = 100

        # Determine key improvements/strengths based on status
        key_improvements = None
        key_strengths = None
        if job.status == "rejected":
            key_improvements = data.get("key_improvements", None)
        elif job.status in ["accepted", "offer"]:
            key_strengths = data.get("key_strengths", None)

        # Optional: Combine feedback into general notes (for logging or future sync)
        general_notes = "\n\n".join(filter(None, [
            data.get("notes", ""),
            data.get("detailed_feedback", ""),
            f"Key Improvements: {key_improvements}" if key_improvements else None,
            f"Key Strengths: {key_strengths}" if key_strengths else None
        ])).strip()
        print("DEBUG: Combined general_notes (if needed):", general_notes)

        # Check if feedback already exists
        feedback_check_query = text("SELECT id FROM feedback WHERE job_id = :job_id")
        feedback_exists = db.session.execute(feedback_check_query, {"job_id": job_id}).fetchone()
        print("DEBUG: feedback_exists:", feedback_exists)

        if request.method == 'POST':
            if feedback_exists:
                print("DEBUG: POST branch: Feedback already exists for job", job_id)
                return jsonify({"message": "Feedback already exists for this job"}), 400

            # Insert new feedback
            insert_feedback_query = text("""
                INSERT INTO feedback (job_id, category_id, notes, detailed_feedback, key_improvements, key_strengths)
                VALUES (:job_id, :category_id, :notes, :detailed_feedback, :key_improvements, :key_strengths);
            """)
            db.session.execute(insert_feedback_query, {
                "job_id": job_id,
                "category_id": data["category_id"],
                "notes": data.get("notes", ""),
                "detailed_feedback": data.get("detailed_feedback", ""),
                "key_improvements": key_improvements,
                "key_strengths": key_strengths
            })
            print("DEBUG: Inserting new feedback for job", job_id)

        elif request.method == 'PUT':
            if not feedback_exists:
                print("DEBUG: PUT branch: Feedback not found for job", job_id)
                return jsonify({"message": "Feedback not found"}), 404

            # Update existing feedback
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
            print("DEBUG: Updating existing feedback for job", job_id)
        else:
            print("DEBUG: Received unsupported method:", request.method)

        db.session.commit()
        print("DEBUG: Feedback operation committed successfully for job", job_id)
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
        result = [c.serialize() for c in categories]
        print("✅ Feedback Categories from DB:", result)  # Debugging log
        return jsonify(result), 200
    except Exception as e:
        print(f"❌ ERROR in `get_feedback_categories`: {str(e)}")
        return jsonify({"error": str(e)}), 500
    
@jobs_bp.route('/<int:job_id>', methods=['PUT'])
@jwt_required()
@cross_origin()
def update_job(job_id):
    """Update job application fields (job_title, company, status, etc.)."""
    try:
        # Get current user ID from JWT and convert to int
        current_user_id = int(get_jwt_identity())

        # Get the JSON data from the request
        data = request.get_json()
        if 'job_title' not in data or 'company' not in data:
            return jsonify({"message": "Missing required fields"}), 400

        # Fetch the job's owner from the database
        job_check_query = text("SELECT user_id FROM job_application WHERE id = :job_id")
        row = db.session.execute(job_check_query, {"job_id": job_id}).fetchone()

        if not row:
            return jsonify({"message": "Job not found"}), 404

        # Convert the fetched user_id to int for a fair comparison
        db_user_id = int(row[0])
        print(f"DEBUG: DB user_id: {db_user_id}, Current user_id: {current_user_id}")

        if db_user_id != current_user_id:
            return jsonify({"message": "Unauthorized"}), 403

        # Process the applied_date if provided
        applied_date = None
        if data.get('applied_date'):
            try:
                applied_date = datetime.strptime(data['applied_date'], "%Y-%m-%d").date()
            except Exception as e:
                return jsonify({"message": "Invalid applied_date format"}), 400

        # Build and execute the update query
        update_query = text("""
            UPDATE job_application
            SET 
              job_title = :job_title,
              company = :company,
              role_category = :role_category,
              status = :status,
              applied_date = :applied_date,
              general_notes = :general_notes
            WHERE id = :job_id
        """)

        db.session.execute(update_query, {
            "job_id": job_id,
            "job_title": data['job_title'],
            "company": data['company'],
            "role_category": data.get('role_category'),
            "status": data.get('status', 'applied'),
            "applied_date": applied_date,
            "general_notes": data.get('general_notes', '')
        })

        db.session.commit()
        return jsonify({"message": "Job updated successfully by update job"}), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@jobs_bp.route('/<int:job_id>/recommended-questions', methods=['GET'])
@jwt_required()
def get_recommended_questions(job_id):
    """
    Returns recommended interview questions from the question_bank.
    If a query parameter unusedOnly=true (default) is provided, only questions not yet
    added for the job (i.e. not present in job_interview_questions) are returned.
    """
    unused_only = request.args.get('unusedOnly', 'true').lower() == 'true'
    try:
        if unused_only:
            query = text("""
                SELECT qb.id, qb.question_text, qb.category
                FROM question_bank qb
                LEFT JOIN job_interview_questions jij
                  ON qb.id = jij.question_id AND jij.job_id = :job_id
                WHERE jij.id IS NULL
            """)
            params = {"job_id": job_id}
        else:
            query = text("""
                SELECT qb.id, qb.question_text, qb.category
                FROM question_bank qb
            """)
            params = {}
        print("DEBUG: Fetching recommended questions with params:", params)
        results = db.session.execute(query, params).fetchall()
        print("DEBUG: Raw query results:", results)
        questions = []
        for row in results:
            questions.append({
                "id": row[0],
                "text": row[1],
                "category": row[2]
            })
        print("DEBUG: Final recommended questions to return:", questions)
        return jsonify(questions), 200
    except Exception as e:
        db.session.rollback()
        print(f"❌ ERROR in get_recommended_questions: {str(e)}")
        return jsonify({"error": str(e)}), 500
    
@jobs_bp.route('/recommended-questions', methods=['GET'])
@jwt_required()
def get_all_recommended_questions():
    """
    Returns all recommended interview questions from the question_bank.
    """
    try:
        query = text("""
            SELECT qb.id, qb.question_text, qb.category
            FROM question_bank qb
        """)
        results = db.session.execute(query).fetchall()
        questions = []
        for row in results:
            questions.append({
                "id": row[0],
                "text": row[1],
                "category": row[2]
            })
        print("DEBUG: Returning all recommended questions:", questions)
        return jsonify(questions), 200
    except Exception as e:
        db.session.rollback()
        print(f"❌ ERROR in get_all_recommended_questions: {str(e)}")
        return jsonify({"error": str(e)}), 500

@jobs_bp.route('/<int:job_id>/interview-questions', methods=['POST'])
@jwt_required()
def save_interview_questions(job_id):
    """
    Save interview questions & answers for a job.
    This endpoint expects a JSON array of items.
    Each item should contain:
      - question_id (if recommended) [optional]
      - custom_question (if custom) [optional]
      - answer
    For simplicity, we delete existing entries for the job and insert new ones.
    """
    try:
        data = request.get_json()  # expect a list of Q&A objects
        if not isinstance(data, list):
            return jsonify({"message": "Expected a list of interview questions."}), 400

        # Delete existing interview questions for the job
        delete_query = text("DELETE FROM job_interview_questions WHERE job_id = :job_id")
        db.session.execute(delete_query, {"job_id": job_id})
        
        # Insert new interview questions
        insert_query = text("""
            INSERT INTO job_interview_questions (job_id, question_id, custom_question, answer)
            VALUES (:job_id, :question_id, :custom_question, :answer)
        """)
        
        for item in data:
            # Use recommended question if question_id is provided; otherwise, use custom_question.
            question_id = item.get("question_id")
            custom_question = item.get("custom_question") if not question_id else None
            answer = item.get("answer", "")
            db.session.execute(insert_query, {
                "job_id": job_id,
                "question_id": question_id,
                "custom_question": custom_question,
                "answer": answer
            })
        
        db.session.commit()
        return jsonify({"message": "Interview questions saved successfully."}), 200

    except Exception as e:
        db.session.rollback()
        print(f"❌ ERROR in save_interview_questions: {str(e)}")
        return jsonify({"error": str(e)}), 500

@jobs_bp.route('/<int:job_id>/interview-questions', methods=['GET'])
@jwt_required()
def get_interview_questions(job_id):
    """
    Retrieve all interview questions for a given job.
    """
    try:
        query = text("""
            SELECT id, question_id, custom_question, answer
            FROM job_interview_questions
            WHERE job_id = :job_id
        """)
        results = db.session.execute(query, {"job_id": job_id}).fetchall()
        questions = []
        for row in results:
            questions.append({
                "id": row[0],
                "question_id": row[1],
                "custom_question": row[2],
                "question": row[1] and None or row[2],  # you can adjust logic to combine recommended/custom
                "answer": row[3]
            })
        return jsonify(questions), 200
    except Exception as e:
        db.session.rollback()
        print(f"❌ ERROR in get_interview_questions: {str(e)}")
        return jsonify({"error": str(e)}), 500