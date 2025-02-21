from math import ceil
from flask import Blueprint, request, jsonify
from extensions import db
from models import JobApplication, User  # ✅ Import User model
from flask_jwt_extended import jwt_required, get_jwt_identity  
from flask_cors import cross_origin  # ✅ Import CORS decorator

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
        current_user_id = get_jwt_identity()
        jobs = JobApplication.query.filter_by(user_id=current_user_id).all()
        return jsonify([job.serialize() for job in jobs]), 200

@jobs_bp.route('/', methods=['GET'])
@jwt_required()
def list_jobs():
    """Retrieve paginated job applications for the logged-in user."""
    try:
        current_user_id = get_jwt_identity()

        # Pagination parameters
        page = request.args.get('page', default=1, type=int)
        limit = request.args.get('limit', default=5, type=int)  # Default to 5 jobs per page

        total_jobs = JobApplication.query.filter_by(user_id=current_user_id).count()
        total_pages = ceil(total_jobs / limit)

        jobs = JobApplication.query.filter_by(user_id=current_user_id)\
            .paginate(page=page, per_page=limit, error_out=False)

        job_list = [{
            'id': job.id,
            'job_title': job.job_title,
            'company': job.company,
            'status': job.status,
            'feedback': job.feedback
        } for job in jobs.items]

        return jsonify({
            'jobs': job_list,
            'totalPages': total_pages
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@jobs_bp.route('/<int:job_id>', methods=['GET'])
@jwt_required()
def get_job_by_id(job_id):
    """Retrieve a job application by ID"""
    job = JobApplication.query.get(job_id)
    if not job:
        return jsonify({'message': 'Job not found'}), 404
    return jsonify(job.serialize()), 200

@jobs_bp.route('/<int:job_id>', methods=['PUT'])
@jwt_required()
def update_job(job_id):
    """Update an existing job application"""
    job = JobApplication.query.get(job_id)
    if not job:
        return jsonify({'message': 'Job not found'}), 404

    data = request.get_json()
    job.status = data.get('status', job.status)

    if job.status in ['Accepted', 'Rejected']:
        if 'feedback' not in data or not data['feedback']:
            return jsonify({'message': 'Feedback is required for this status'}), 400
        job.feedback = data['feedback']

    try:
        db.session.commit()
        return jsonify({'message': 'Job updated successfully', 'job': job.serialize()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@jobs_bp.route('/<int:job_id>', methods=['DELETE'])
@jwt_required()
def delete_job(job_id):
    """Delete a job application"""
    job = JobApplication.query.get(job_id)
    if not job:
        return jsonify({'message': 'Job not found'}), 404

    try:
        db.session.delete(job)
        db.session.commit()
        return jsonify({'message': 'Job deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
