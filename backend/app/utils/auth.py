from flask import request, jsonify
from functools import wraps
from datetime import datetime
import string
import secrets
from ..models import UserSession
from ..database import get_db

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"message": "Token de seguridad no proporcionado"}), 401
        
        token = auth_header.split(' ')[1]
        db = get_db()
        session_record = db.query(UserSession).filter(UserSession.token == token).first()
        
        if not session_record or session_record.expiry < datetime.utcnow():
            if session_record: 
                db.delete(session_record)
                db.commit()
            return jsonify({"message": "Sesión inválida o expirada"}), 401
        
        request.user_id = session_record.user_id
        return f(*args, **kwargs)
    return decorated

def generate_secure_password(length=14):
    symbols = "@$!%*?&"
    alphabet = string.ascii_letters + string.digits + symbols
    while True:
        password = ''.join(secrets.choice(alphabet) for i in range(length))
        if (any(c.isupper() for c in password)
                and any(c.isdigit() for c in password)
                and any(c in symbols for c in password)):
            break
    return password
