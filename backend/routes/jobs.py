from flask import Blueprint, request, jsonify
from extensions import db
from models import JobApplication

jobs_bp = Blueprint('jobs', __name__)

@jobs_bp.route('/', methods=['POST'])
def create_job():
    """Create a new job application"""
    data = request.get_json()
    
    required_fields = ['user_id', 'job_title', 'company']
    if not all(field in data for field in required_fields):
        return jsonify({'message': 'Missing required fields'}), 400
    
    job = JobApplication(
        user_id=data['user_id'],
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

@jobs_bp.route('/<int:job_id>', methods=['PUT'])
def update_job(job_id):
    """Update an existing job application"""
    job = JobApplication.query.get_or_404(job_id)
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
def delete_job(job_id):
    """Delete a job application"""
    job = JobApplication.query.get_or_404(job_id)

    try:
        db.session.delete(job)
        db.session.commit()
        return jsonify({'message': 'Job deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@jobs_bp.route('/', methods=['GET'])
def list_jobs():
    """List all job applications, with optional filtering"""
    user_id = request.args.get('user_id')

    if user_id:
        jobs = JobApplication.query.filter_by(user_id=user_id).all()
    else:
        jobs = JobApplication.query.all()

    return jsonify([job.serialize() for job in jobs]), 200