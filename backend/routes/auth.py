from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models import User
from extensions import db

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    print(f"🔥 Incoming Signup Request: {data}")  # Debugging

    # Validate required fields
    if not data or 'username' not in data or 'email' not in data or 'password' not in data:
        print("❌ Missing required fields in request")
        return jsonify({'message': 'Missing required fields'}), 400

    username = data['username'].strip()
    email = data['email'].strip()
    password = data['password']

    print(f"🔍 Checking if user exists: {username}, {email}")

    if User.query.filter((User.username == username) | (User.email == email)).first():
        print("❌ User already exists")
        return jsonify({'message': 'User already exists'}), 400

    # Hash the password
    password_hash = generate_password_hash(password)
    
    try:
        new_user = User(username=username, email=email, password_hash=password_hash)
        db.session.add(new_user)
        db.session.commit()
        print(f"✅ User created successfully: {username}")
        return jsonify({'message': 'User created successfully'}), 201
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error inserting user: {e}")
        return jsonify({'message': 'Database error', 'error': str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username_or_email = data.get('username_or_email')
    password = data.get('password')

    user = User.query.filter((User.username == username_or_email) | (User.email == username_or_email)).first()

    if user and check_password_hash(user.password_hash, password):
        access_token = create_access_token(identity=str(user.id))  # ✅ Convert ID to string
        return jsonify({'message': 'Logged in successfully', 'token': access_token, 'user': user.serialize()}), 200
    else:
        return jsonify({'message': 'Invalid credentials'}), 401

@auth_bp.route('/current-user', methods=['GET'])
@jwt_required()
def get_current_user():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404
    return jsonify(user.serialize()), 200
