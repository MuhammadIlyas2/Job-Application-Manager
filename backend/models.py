from datetime import datetime
from extensions import db

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    fullname = db.Column(db.String(120), nullable=False)
    password_hash = db.Column(db.String(512), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def serialize(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'fullname': self.fullname,
            'created_at': self.created_at.isoformat()
        }


class JobApplication(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    job_title = db.Column(db.String(100), nullable=False)
    company = db.Column(db.String(100), nullable=False)
    role_category = db.Column(db.String(100))
    status = db.Column(db.String(50), default='applied')
    applied_date = db.Column(db.Date)
    general_notes = db.Column(db.Text, default=None)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def serialize(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'job_title': self.job_title,
            'company': self.company,
            'role_category': self.role_category,
            'status': self.status,
            'applied_date': self.applied_date.isoformat() if self.applied_date else None,
            'general_notes': self.general_notes,
            'created_at': self.created_at.isoformat(),
        }


class FeedbackCategory(db.Model):
    __tablename__ = 'feedback_category'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    type = db.Column(db.Enum('positive', 'negative', 'neutral'), nullable=False)

    def serialize(self):
        return {
            'id': self.id,
            'name': self.name,
            'type': self.type
        }


class Feedback(db.Model):
    __tablename__ = 'feedback'
    id = db.Column(db.Integer, primary_key=True)
    job_id = db.Column(db.Integer, db.ForeignKey('job_application.id'), nullable=False, unique=True)
    category_id = db.Column(db.Integer, db.ForeignKey('feedback_category.id'), nullable=False)
    notes = db.Column(db.String(50), nullable=True)  # Short summary (max 50 chars)
    detailed_feedback = db.Column(db.Text, nullable=True)  # Full feedback
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def serialize(self):
        return {
            "id": self.id,
            "job_id": self.job_id,
            "category_id": self.category_id,
            "notes": self.notes,
            "detailed_feedback": self.detailed_feedback,
            "created_at": self.created_at.isoformat()
        }


class FeedbackStrength(db.Model):
    """
    Stores key strengths for feedback.
    Each row represents either a priority or an additional strength.
    """
    __tablename__ = 'feedback_strength'
    id = db.Column(db.Integer, primary_key=True)
    feedback_id = db.Column(db.Integer, db.ForeignKey('feedback.id', ondelete='CASCADE'), nullable=False)
    is_priority = db.Column(db.Boolean, nullable=False, default=False)
    strength = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def serialize(self):
        return {
            "id": self.id,
            "feedback_id": self.feedback_id,
            "is_priority": self.is_priority,
            "strength": self.strength,
            "created_at": self.created_at.isoformat()
        }


class FeedbackImprovement(db.Model):
    """
    Stores key improvements for feedback.
    Each row represents either a priority or an additional improvement.
    """
    __tablename__ = 'feedback_improvement'
    id = db.Column(db.Integer, primary_key=True)
    feedback_id = db.Column(db.Integer, db.ForeignKey('feedback.id', ondelete='CASCADE'), nullable=False)
    is_priority = db.Column(db.Boolean, nullable=False, default=False)
    improvement = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def serialize(self):
        return {
            "id": self.id,
            "feedback_id": self.feedback_id,
            "is_priority": self.is_priority,
            "improvement": self.improvement,
            "created_at": self.created_at.isoformat()
        }


class QuestionBank(db.Model):
    """
    Stores recommended interview questions.
    """
    __tablename__ = 'question_bank'
    id = db.Column(db.Integer, primary_key=True)
    question_text = db.Column(db.String(255), unique=True, nullable=False)
    category = db.Column(db.String(100), nullable=True)  # Optional, e.g., Technical, Behavioral

    def serialize(self):
        return {
            "id": self.id,
            "question_text": self.question_text,
            "category": self.category
        }


class JobInterviewQuestion(db.Model):
    """
    Associates a job application with interview questions.
    Can reference a recommended question from QuestionBank via `question_id`,
    or store a custom question in `custom_question`.
    The candidate's answer is stored in `answer`.
    """
    __tablename__ = 'job_interview_question'
    id = db.Column(db.Integer, primary_key=True)
    job_id = db.Column(db.Integer, db.ForeignKey('job_application.id'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('question_bank.id'), nullable=True)
    custom_question = db.Column(db.String(255), nullable=True)
    answer = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def serialize(self):
        return {
            "id": self.id,
            "job_id": self.job_id,
            "question_id": self.question_id,
            "custom_question": self.custom_question,
            "answer": self.answer,
            "created_at": self.created_at.isoformat()
        }
