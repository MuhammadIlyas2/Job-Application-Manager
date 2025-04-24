from math import ceil
from flask import Blueprint, request, jsonify
from extensions import db
from models import JobApplication, User, FeedbackCategory, QuestionBank, JobInterviewQuestion, JobStatusHistory
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_cors import cross_origin
from sqlalchemy import text, func
from datetime import datetime

jobs_bp = Blueprint('jobs', __name__)

# --------------------- Utility function to update strengths & improvements ---------------------
# --------------------- Utility function to update strengths & improvements ---------------------
def update_feedback_extras(feedback_id, extras, table_name):
    """
    Delete all current rows for the given feedback_id in the specified table,
    then insert new rows from the extras dict.
    'extras' is expected to be a dict with keys "priority" (string) and "additional" (list of strings).
    'table_name' should be either "feedback_strength" or "feedback_improvement".
    """
    # Determine the correct column name based on the table
    if table_name == "feedback_strength":
        column_name = "strength"
    elif table_name == "feedback_improvement":
        column_name = "improvement"
    else:
        raise ValueError("Invalid table name: must be 'feedback_strength' or 'feedback_improvement'")
    
    # Delete existing entries for this feedback
    delete_query = text(f"DELETE FROM {table_name} WHERE feedback_id = :feedback_id")
    db.session.execute(delete_query, {"feedback_id": feedback_id})
    
    # Prepare the insert query. Use 'is_priority' to mark the priority row.
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

        # Parse applied_date from data
        applied_date = datetime.strptime(data['applied_date'], "%Y-%m-%d").date() if data.get('applied_date') else None
        created_at = datetime.utcnow()

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

            # Insert basic feedback record (if provided)
            if 'feedback' in data and data['feedback']:
                insert_feedback_query = text("""
                    INSERT INTO feedback (job_id, category_id, notes, detailed_feedback)
                    VALUES (:job_id, :category_id, :notes, :detailed_feedback);
                """)
                db.session.execute(insert_feedback_query, {
                    "job_id": job.id,
                    "category_id": data['feedback'].get('category_id', None),
                    "notes": data['feedback'].get('notes', ''),
                    "detailed_feedback": data['feedback'].get('detailed_feedback', '')
                })
                db.session.commit()
                extras = data['feedback']
                feedback = db.session.execute(
                    text("SELECT id FROM feedback WHERE job_id = :job_id"),
                    {"job_id": job.id}
                ).fetchone()
                if feedback:
                    feedback_id = feedback[0]
                    if "strengths" in extras:
                        update_feedback_extras(feedback_id, extras["strengths"], "feedback_strength")
                    if "improvements" in extras:
                        update_feedback_extras(feedback_id, extras["improvements"], "feedback_improvement")
                    db.session.commit()

            # Insert status history records for statuses other than "applied"
            # (The applied date is already in job.applied_date.)
            # Expected additional fields: interview_date, offer_date, accepted_date, rejected_date.
            additional_statuses = [
                ('interview', data.get('interview_date')),
                ('offer', data.get('offer_date')),
                ('accepted', data.get('accepted_date')),
                ('rejected', data.get('rejected_date'))
            ]
            for status, date_val in additional_statuses:
                if date_val:
                    db.session.execute(text("""
                        INSERT INTO job_status_history (job_id, status, status_date)
                        VALUES (:job_id, :status, :status_date)
                    """), {"job_id": job.id, "status": status, "status_date": date_val})
            db.session.commit()

            return jsonify({'message': 'Job application added', 'job': job.serialize()}), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500

    elif request.method == 'GET':
        try:
            current_user_id = get_jwt_identity()
            page = request.args.get('page', default=1, type=int)
            limit = request.args.get('limit', default=5, type=int)
            offset = (page - 1) * limit

            # Extract filter parameters
            search = request.args.get('search', None)
            status_filter = request.args.get('status', None)

            # Extract sort parameters, with defaults:
            sort_by = request.args.get('sort_by', 'created_at')
            sort_order = request.args.get('sort_order', 'desc').lower()

            # Validate sort_by and sort_order
            valid_sort_by = ['applied_date', 'job_title', 'company', 'created_at']
            if sort_by not in valid_sort_by:
                sort_by = 'created_at'
            if sort_order not in ['asc', 'desc']:
                sort_order = 'desc'

            # Build WHERE clause dynamically (using LIKE for MySQL)
            where_clauses = ["ja.user_id = :user_id"]
            params = {"user_id": current_user_id, "limit": limit, "offset": offset}

            if search:
                where_clauses.append("(ja.job_title LIKE :search OR ja.company LIKE :search)")
                params["search"] = f"%{search}%"
            if status_filter:
                where_clauses.append("ja.status = :status")
                params["status"] = status_filter

            where_clause = " AND ".join(where_clauses)

            # Count query with filtering
            count_query = text(f"SELECT COUNT(*) FROM job_application ja WHERE {where_clause}")
            total_jobs = db.session.execute(count_query, params).scalar()
            total_pages = ceil(total_jobs / limit) if limit else 1

            # Main query with sorting and filtering
            query = text(f"""
                SELECT 
                    ja.id, ja.job_title, ja.company, ja.status, ja.general_notes, ja.applied_date,
                    COALESCE(f.notes, 'No feedback yet') AS feedback
                FROM job_application ja
                LEFT JOIN feedback f ON ja.id = f.job_id
                WHERE {where_clause}
                ORDER BY ja.{sort_by} {sort_order}, ja.id DESC
                LIMIT :limit OFFSET :offset;
            """)
            results = db.session.execute(query, params).fetchall()

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
                "totalPages": total_pages,
                "totalJobs": total_jobs,
                "currentPage": page
            }), 200

        except Exception as e:
            print(f"❌ ERROR in create_or_list_jobs (GET): {str(e)}")
            return jsonify({"error": str(e)}), 500

    return jsonify({'message': 'Invalid request method'}), 405

@jobs_bp.route('/<int:job_id>', methods=['GET'])
def get_job(job_id):
    try:
        query = text("""
        SELECT 
            ja.id, ja.job_title, ja.company, ja.status, ja.general_notes, ja.applied_date, ja.created_at, ja.role_category,
            f.id AS feedback_id, f.notes, f.detailed_feedback, f.category_id,
            fc.name AS category_name, fc.type AS category_type
        FROM job_application ja
        LEFT JOIN feedback f ON ja.id = f.job_id
        LEFT JOIN feedback_category fc ON f.category_id = fc.id
        WHERE ja.id = :job_id;
        """)
        result = db.session.execute(query, {"job_id": job_id}).fetchone()
        if not result:
            return jsonify({"message": "Job not found"}), 404

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
            "interview_date": '',
            "offer_date": '',       
            "accepted_date": '',  
            "rejected_date": '',   
            "created_at": created_at,
            "role_category": result[7],
            "feedback": {
                "id": result[8],
                "notes": result[9] if result[9] is not None else '',
                "detailed_feedback": result[10] if result[10] is not None else '',
                "category_id": result[11],
                "category_name": result[12] if result[12] else "No category",
                "category_type": result[13] if result[13] else "N/A"
            }
        }
        return jsonify(job_data), 200
    except Exception as e:
        print(f"❌ ERROR in get_job: {str(e)}")
        return jsonify({"error": str(e)}), 500

@jobs_bp.route('/jobs/<int:job_id>/feedback', methods=['POST', 'PUT'])
@jwt_required()
def handle_feedback(job_id):
    try:
        data = request.get_json()
        print("DEBUG: Received feedback request. Method:", request.method)
        print("DEBUG: Feedback data:", data)
        job_check_query = text("SELECT id, status FROM job_application WHERE id = :job_id")
        job = db.session.execute(job_check_query, {"job_id": job_id}).fetchone()
        if not job:
            print("DEBUG: Job not found for id:", job_id)
            return jsonify({"message": "Job not found"}), 404

        # Default category_id to 100 if left blank
        if not data.get("category_id"):
            data["category_id"] = 100

        # For this new design, the feedback table now stores only basic data.
        # Strengths and improvements will be updated in their own tables.
        feedback_check_query = text("SELECT id FROM feedback WHERE job_id = :job_id")
        feedback_exists = db.session.execute(feedback_check_query, {"job_id": job_id}).fetchone()
        print("DEBUG: feedback_exists:", feedback_exists)
        if request.method == 'POST':
            if feedback_exists:
                return jsonify({"message": "Feedback already exists for this job"}), 400
            insert_feedback_query = text("""
                INSERT INTO feedback (job_id, category_id, notes, detailed_feedback)
                VALUES (:job_id, :category_id, :notes, :detailed_feedback);
            """)
            db.session.execute(insert_feedback_query, {
                "job_id": job_id,
                "category_id": data["category_id"],
                "notes": data.get("notes", ""),
                "detailed_feedback": data.get("detailed_feedback", "")
            })
            db.session.commit()
            feedback = db.session.execute(text("SELECT id FROM feedback WHERE job_id = :job_id"), {"job_id": job_id}).fetchone()
            feedback_id = feedback[0] if feedback else None
        elif request.method == 'PUT':
            if not feedback_exists:
                return jsonify({"message": "Feedback not found"}), 404
            update_query = text("""
                UPDATE feedback
                SET category_id = :category_id, notes = :notes, detailed_feedback = :detailed_feedback
                WHERE job_id = :job_id;
            """)
            db.session.execute(update_query, {
                "job_id": job_id,
                "category_id": data["category_id"],
                "notes": data.get("notes", ""),
                "detailed_feedback": data.get("detailed_feedback", "")
            })
            db.session.commit()
            feedback_id = feedback_exists[0]
        else:
            return jsonify({"message": "Unsupported method"}), 405

        # Now update strengths and improvements using the new tables
        if feedback_id:
            if "strengths" in data:
                update_feedback_extras(feedback_id, data["strengths"], "feedback_strength")
            if "improvements" in data:
                update_feedback_extras(feedback_id, data["improvements"], "feedback_improvement")
            db.session.commit()

        return jsonify({"message": "Feedback saved successfully and job updated"}), 200
    except Exception as e:
        db.session.rollback()
        print(f"❌ ERROR in handle_feedback: {str(e)}")
        return jsonify({"error": str(e)}), 500



@jobs_bp.route('/jobs/<int:job_id>', methods=['DELETE', 'OPTIONS'])
@cross_origin()
@jwt_required()
def delete_job(job_id):
    if request.method == "OPTIONS":
        return jsonify({'message': 'CORS preflight successful'}), 200
    try:
        current_user_id = get_jwt_identity()
        delete_query = text("""
            DELETE FROM job_application 
            WHERE id = :job_id 
            AND user_id = :user_id
        """)
        result = db.session.execute(delete_query, {"job_id": job_id, "user_id": current_user_id})
        if result.rowcount == 0:
            return jsonify({"message": "Job not found or unauthorized"}), 404
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
        categories = FeedbackCategory.query.order_by(FeedbackCategory.name.asc()).all()
        result = [c.serialize() for c in categories]
        print("✅ Feedback Categories (alphabetically sorted):", result)
        return jsonify(result), 200
    except Exception as e:
        print(f"❌ ERROR in get_feedback_categories: {str(e)}")
        return jsonify({"error": str(e)}), 500

@jobs_bp.route('/<int:job_id>', methods=['PUT'])
@jwt_required()
@cross_origin()
def update_job(job_id):
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()
        if 'job_title' not in data or 'company' not in data:
            return jsonify({"message": "Missing required fields"}), 400

        # Check job ownership
        job_check_query = text("SELECT user_id FROM job_application WHERE id = :job_id")
        row = db.session.execute(job_check_query, {"job_id": job_id}).fetchone()
        if not row:
            return jsonify({"message": "Job not found"}), 404
        db_user_id = int(row[0])
        if db_user_id != current_user_id:
            return jsonify({"message": "Unauthorized"}), 403

        # Parse applied_date
        applied_date = None
        if data.get('applied_date'):
            try:
                applied_date = datetime.strptime(data['applied_date'], "%Y-%m-%d").date()
            except Exception as e:
                return jsonify({"message": "Invalid applied_date format"}), 400

        # Update the job_application record
        update_query = text("""
            UPDATE job_application
            SET job_title = :job_title,
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

        # Instead of deleting existing history, we now insert new status history rows.
        # (This way, historical changes accumulate over time.)
        additional_statuses = [
            ('interview', data.get('interview_date')),
            ('offer', data.get('offer_date')),
            ('accepted', data.get('accepted_date')),
            ('rejected', data.get('rejected_date'))
        ]
        for status, date_val in additional_statuses:
            if date_val:
                db.session.execute(text("""
                    INSERT INTO job_status_history (job_id, status, status_date)
                    VALUES (:job_id, :status, :status_date)
                """), {"job_id": job_id, "status": status, "status_date": date_val})
        db.session.commit()

        return jsonify({"message": "Job updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        print(f"❌ ERROR in update_job: {str(e)}")
        return jsonify({"error": str(e)}), 500


@jobs_bp.route('/<int:job_id>/recommended-questions', methods=['GET'])
@jwt_required()
def get_recommended_questions(job_id):
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
    try:
        data = request.get_json()  # Expect a list of Q&A objects with 'question' and 'answer'
        if not isinstance(data, list):
            return jsonify({"message": "Expected a list of interview questions."}), 400

        # Delete existing interview questions for the job
        delete_query = text("DELETE FROM job_interview_questions WHERE job_id = :job_id")
        db.session.execute(delete_query, {"job_id": job_id})

        # Insert new interview questions.
        # Check for an exact (case‑insensitive) match in QuestionBank.
        insert_query = text("""
            INSERT INTO job_interview_questions (job_id, question_id, custom_question, answer)
            VALUES (:job_id, :question_id, :custom_question, :answer)
        """)
        for item in data:
            question_text = item.get("question", "").strip()
            answer = item.get("answer", "").strip()
            print("DEBUG: Processing interview Q&A item:", question_text, "Answer:", answer)
            recommended = db.session.query(QuestionBank).filter(func.lower(QuestionBank.question_text) == question_text.lower()).first()
            if recommended:
                question_id = recommended.id
                custom_question = None
                print("DEBUG: Matched recommended question:", recommended.question_text)
            else:
                question_id = None
                custom_question = question_text
                print("DEBUG: No matching recommended question; saving as custom.")
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
    try:
        query = text("""
            SELECT jiq.id, jiq.question_id, qb.question_text as recommended_question, jiq.custom_question, jiq.answer
            FROM job_interview_questions jiq
            LEFT JOIN question_bank qb ON jiq.question_id = qb.id
            WHERE jiq.job_id = :job_id
        """)
        results = db.session.execute(query, {"job_id": job_id}).fetchall()
        questions = []
        for row in results:
            question_text = row[2] if row[2] is not None else row[3]
            questions.append({
                "id": row[0],
                "question_id": row[1],
                "question": question_text,
                "answer": row[4]
            })
        return jsonify(questions), 200
    except Exception as e:
        db.session.rollback()
        print(f"❌ ERROR in get_interview_questions: {str(e)}")
        return jsonify({"error": str(e)}), 500

@jobs_bp.route('/<int:job_id>/feedback/strengths', methods=['GET'])
@jwt_required()
def get_feedback_strengths(job_id):
    try:
        # Get the feedback record for this job
        feedback = db.session.execute(
            text("SELECT id FROM feedback WHERE job_id = :job_id"),
            {"job_id": job_id}
        ).fetchone()
        if not feedback:
            return jsonify({"priority": None, "additional": []}), 200
        feedback_id = feedback[0]
        query = text("SELECT is_priority, strength FROM feedback_strength WHERE feedback_id = :feedback_id")
        results = db.session.execute(query, {"feedback_id": feedback_id}).fetchall()
        priority = None
        additional = []
        for row in results:
            if row[0]:
                priority = row[1]
            else:
                additional.append(row[1])
        return jsonify({"priority": priority, "additional": additional}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@jobs_bp.route('/<int:job_id>/feedback/improvements', methods=['GET'])
@jwt_required()
def get_feedback_improvements(job_id):
    try:
        feedback = db.session.execute(
            text("SELECT id FROM feedback WHERE job_id = :job_id"),
            {"job_id": job_id}
        ).fetchone()
        if not feedback:
            return jsonify({"priority": None, "additional": []}), 200
        feedback_id = feedback[0]
        query = text("SELECT is_priority, improvement FROM feedback_improvement WHERE feedback_id = :feedback_id")
        results = db.session.execute(query, {"feedback_id": feedback_id}).fetchall()
        priority = None
        additional = []
        for row in results:
            if row[0]:
                priority = row[1]
            else:
                additional.append(row[1])
        return jsonify({"priority": priority, "additional": additional}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    
@jobs_bp.route('/<int:job_id>/status-history', methods=['GET'])
@jwt_required()
def get_job_status_history(job_id):
    try:
        query = text("""
            SELECT id, job_id, status, status_date, created_at 
            FROM job_status_history 
            WHERE job_id = :job_id 
            ORDER BY status_date ASC
        """)
        results = db.session.execute(query, {"job_id": job_id}).fetchall()
        # Use row._mapping to convert each row to a dictionary
        history = [dict(row._mapping) for row in results]
        return jsonify(history), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    
@jobs_bp.route('/<int:job_id>/feedback', methods=['DELETE'])
@jwt_required()
def delete_feedback(job_id):
    try:
        # Delete associated strengths/improvements first
        db.session.execute(text("""
            DELETE FROM feedback_strength 
            WHERE feedback_id IN (
                SELECT id FROM feedback WHERE job_id = :job_id
            )
        """), {"job_id": job_id})
        
        db.session.execute(text("""
            DELETE FROM feedback_improvement 
            WHERE feedback_id IN (
                SELECT id FROM feedback WHERE job_id = :job_id
            )
        """), {"job_id": job_id})

        # Delete main feedback record
        db.session.execute(text("""
            DELETE FROM feedback 
            WHERE job_id = :job_id
        """), {"job_id": job_id})
        
        db.session.commit()
        return jsonify({"message": "Feedback deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500