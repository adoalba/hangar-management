import secrets
import uuid
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from .models import User
from ..models import UserSession
from ..database import db, get_db

auth_bp = Blueprint('auth_bp', __name__, url_prefix='/api/users')

@auth_bp.route('/', methods=['GET'])
@login_required
def list_users():
    if current_user.role != 'admin':
        return jsonify({"error": "Unauthorized"}), 403
    users = User.query.all()
    return jsonify([u.to_dict() for u in users])

@auth_bp.route('/create', methods=['POST'])
@login_required
def create_user():
    if current_user.role != 'admin':
        return jsonify({"error": "Unauthorized"}), 403
    
    data = request.json
    if User.query.filter((User.username == data['username']) | (User.email == data['email'])).first():
        return jsonify({"error": "User already exists"}), 400
    
    try:
        new_user = User(
            username=data['username'],
            email=data['email'],
            role=data.get('role', 'view')
        )
        
        password = data.get('password')
        if not password:
            # Remote Invite Flow Simulation
            token = secrets.token_urlsafe(16)
            print(f">>> [INVITE SIMULATION] Link for {new_user.email}: /setup?token={token}")
            # Placeholder password for MVP
            new_user.set_password("TempPass123!@#")
        else:
            new_user.set_password(password)
            
        db.session.add(new_user)
        db.session.commit()
        return jsonify({"message": "User created", "user": new_user.to_dict()}), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

@auth_bp.route('/<int:id>', methods=['DELETE'])
@login_required
def delete_user(id):
    if current_user.role != 'admin':
        return jsonify({"error": "Unauthorized"}), 403
    if id == current_user.id:
        return jsonify({"error": "Cannot self-delete"}), 400
    
    user = User.query.get_or_404(id)
    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "User deleted"}), 200

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    db_sess = get_db()
    user = User.query.filter_by(username=data.get('username')).first()
    
    if user and user.check_password(data.get('password')):
        login_user(user, remember=True)
        
        # Security Mandate: Return Session Token for Frontend Compatibility
        token = str(uuid.uuid4())
        expiry = datetime.utcnow() + timedelta(hours=24)
        
        # Standardize session persistence
        new_session = UserSession(token=token, user_id=user.id, expiry=expiry)
        db_sess.add(new_session)
        db_sess.commit()
        
        return jsonify({
            "message": "Login successful",
            "token": token,
            "user": user.to_dict()
        }), 200
        
    return jsonify({"error": "Invalid credentials"}), 401

@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({"message": "Logged out"}), 200
