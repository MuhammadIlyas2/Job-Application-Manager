from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, get_jwt_identity, verify_jwt_in_request
from extensions import db
from routes.auth import auth_bp
from routes.jobs import jobs_bp
from flask_jwt_extended import decode_token
from routes.analytics import analytics_bp


app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:ChessFun%402@localhost/jam_db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'your_secret_key_here'

db.init_app(app)
jwt = JWTManager(app)

# ✅ Ensure JWT is verified in every request
@app.before_request
def log_request_info():
    print(f"🔥 Incoming Request: {request.method} {request.url}")
    print(f"🔹 Headers: {dict(request.headers)}")
    if "Authorization" in request.headers:
        token = request.headers["Authorization"].split(" ")[1]  # Extract token
        try:
            decoded_token = decode_token(token)  # ✅ Decode token to verify its contents
            print(f"✅ JWT Decoded: {decoded_token}")
        except Exception as e:
            print(f"❌ JWT Error: {str(e)}")

# ✅ CORS Configuration
CORS(app, resources={r"/api/*": {"origins": "http://localhost:4200"}}, supports_credentials=True)

# Register Blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(jobs_bp, url_prefix='/api/jobs')
app.register_blueprint(analytics_bp, url_prefix='/api/analytics')


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
