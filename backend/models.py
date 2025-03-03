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
    applied_date = db.Column(db.DateTime, default=datetime.utcnow)
    general_notes = db.Column(db.Text, default=None)

    def serialize(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'job_title': self.job_title,
            'company': self.company,
            'role_category': self.role_category,
            'status': self.status,
            'applied_date': self.applied_date.isoformat(),
            'general_notes': self.general_notes,
        }


class FeedbackCategory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    type = db.Column(db.Enum('positive', 'negative'), nullable=False)

    def serialize(self):
        return {
            'id': self.id,
            'name': self.name,
            'type': self.type
        }


class Feedback(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    job_id = db.Column(db.Integer, db.ForeignKey('job_application.id'), nullable=False, unique=True)  # 🔹 1 job = 1 feedback
    category_id = db.Column(db.Integer, db.ForeignKey('feedback_category.id'), nullable=False)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # ✅ Convert SQLAlchemy Object to JSON
    def serialize(self):
        return {
            "id": self.id,
            "job_id": self.job_id,
            "category_id": self.category_id,
            "notes": self.notes,
            "created_at": self.created_at.isoformat()
        }
