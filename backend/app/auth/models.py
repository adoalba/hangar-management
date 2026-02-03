import re
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from ..database import db

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256))
    role = db.Column(db.String(20), default='view') # 'admin', 'tech', 'view'
    is_active = db.Column(db.Boolean, default=True)

    def set_password(self, password):
        # Mandatory Password Policy: Min 10, 1 Upper, 1 Number, 1 Symbol
        # Regex per Architect (Adjusted for '#' compatibility): ^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{10,}$
        if not re.match(r'^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{10,}$', password):
            raise ValueError("La contraseña debe tener 10+ caracteres, una mayúscula, un número y un símbolo.")
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'active': self.is_active
        }
