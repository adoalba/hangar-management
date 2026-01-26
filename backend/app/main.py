
from flask import Flask, request, jsonify, send_from_directory, send_file, g
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_compress import Compress
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.exc import SQLAlchemyError
import os
import logging
import uuid
import secrets
import string
import json
from datetime import datetime, timedelta
from functools import wraps
from sqlalchemy import func, text

import re

from .models import SessionLocal, User, UserSession, AviationPart, Contact
from . import server_email # Módulo de envío de correo
from .reports import reports_bp  # Módulo de reportes granulares

import logging
from logging.handlers import RotatingFileHandler
import os

# --- CONFIGURACIÓN DE LOGGING ---
LOG_DIR = "/app/logs"
if not os.path.exists(LOG_DIR) and os.access("/app", os.W_OK):
    os.makedirs(LOG_DIR, exist_ok=True)

log_format = logging.Formatter('%(asctime)s [%(levelname)s] %(name)s: %(message)s')
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Consola
console_handler = logging.StreamHandler()
console_handler.setFormatter(log_format)
logger.addHandler(console_handler)

# Archivo con rotación (si es posible escribir)
try:
    file_handler = RotatingFileHandler(
        os.path.join(LOG_DIR, "app.log"), 
        maxBytes=10*1024*1024, # 10MB
        backupCount=5
    )
    file_handler.setFormatter(log_format)
    logger.addHandler(file_handler)
except Exception:
    logger.warning("No se pudo inicializar el log en archivo, solo consola disponible.")


# --- APP SETUP ---
app = Flask(__name__)
CORS(app)
Compress(app)

# Register Blueprints
app.register_blueprint(reports_bp)

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["2000 per day", "500 per hour"],
    storage_uri="memory://"
)

# --- DATABASE SESSION MANAGEMENT ---
def get_db():
    if 'db' not in g:
        g.db = SessionLocal()
    return g.db

@app.teardown_appcontext
def teardown_db(exception):
    db = g.pop('db', None)
    if db is not None:
        db.close()

# --- ERROR HANDLERS ---
@app.errorhandler(SQLAlchemyError)
def handle_db_error(e):
    logger.error(f"Database error: {str(e)}")
    return jsonify({"message": "Error interno de base de datos"}), 500

@app.errorhandler(404)
def not_found(e):
    return jsonify({"message": "Recurso no encontrado"}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({"message": "Error interno del servidor"}), 500

# --- MIDDLEWARE DE SEGURIDAD Y HELPERS ---

def to_camel_case(snake_str):
    return re.sub(r'_([a-z])', lambda x: x.group(1).upper(), snake_str)

def to_snake_case(camel_str):
    return re.sub(r'(?<!^)(?=[A-Z])', '_', camel_str).lower()

def part_to_camel_dict(part):
    d = {c.name: getattr(part, c.name) for c in part.__table__.columns}
    return {to_camel_case(k): v for k, v in d.items()}

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
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*()_+"
    while True:
        password = ''.join(secrets.choice(alphabet) for i in range(length))
        if (any(c.islower() for c in password)
                and any(c.isupper() for c in password)
                and sum(c.isdigit() for c in password) >= 2
                and any(c in "!@#$%^&*()_+" for c in password)):
            break
    return password

def user_to_dict(user):
    return {
        "id": user.id, 
        "name": user.name, 
        "username": user.username, 
        "email": user.email, 
        "role": user.role, 
        "active": user.active, 
        "suspended": user.suspended
    }

# --- ENDPOINTS DE USUARIO Y SESIÓN ---

@app.route('/api/login-check', methods=['POST'])
@limiter.limit("5 per minute")
def login_check():
    data = request.json
    username = data.get('username', '').lower().strip()
    password = data.get('password', '')
    
    db = get_db()
    user = db.query(User).filter(func.lower(User.username) == username).first()
    
    if user and check_password_hash(user.password, password):
        if user.suspended or not user.active:
            return jsonify({"message": "Cuenta restringida."}), 403
            
        token = str(uuid.uuid4())
        db.query(UserSession).filter(UserSession.user_id == user.id).delete()
        new_session = UserSession(token=token, user_id=user.id, expiry=datetime.utcnow() + timedelta(hours=8))
        db.add(new_session)
        db.commit()
        
        user_data = {"id": user.id, "name": user.name, "role": user.role, "mustChangePassword": user.must_change_password}
        return jsonify({"status": "success", "token": token, "user": user_data})
    
    return jsonify({"message": "Credenciales de acceso incorrectas"}), 401

@app.route('/api/update-password', methods=['POST'])
@token_required
def update_password():
    data = request.json
    new_password = data.get('password')
    
    db = get_db()
    user = db.query(User).filter(User.id == request.user_id).first()
    if user:
        user.password = generate_password_hash(new_password)
        user.must_change_password = False
        db.commit()
        return jsonify({"message": "Contraseña actualizada."})
    
    return jsonify({"message": "Usuario no encontrado"}), 404


@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    """
    Request password reset - sends email with reset token.
    No authentication required.
    """
    data = request.json
    email = data.get('email', '').lower().strip()
    
    if not email:
        return jsonify({"message": "Email requerido"}), 400
    
    db = get_db()
    user = db.query(User).filter(func.lower(User.email) == email).first()
    
    # Always return success to prevent email enumeration
    if not user:
        return jsonify({"message": "Si el correo está registrado, recibirás instrucciones de recuperación."})
    
    # Generate reset token (expires in 1 hour)
    reset_token = secrets.token_urlsafe(32)
    user.setup_token = reset_token
    user.setup_token_expiry = datetime.utcnow() + timedelta(hours=1)
    db.commit()
    
    # Build reset URL
    base_url = request.host_url.rstrip('/')
    reset_url = f"{base_url}/#/reset-password?token={reset_token}"
    
    # Send email
    email_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: white; padding: 40px; border-radius: 16px;">
        <div style="background: #1e293b; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
            <h1 style="margin: 0; font-size: 18px; font-weight: 900; letter-spacing: 1px;">WORLD CLASS AVIATION</h1>
            <p style="margin: 5px 0 0 0; font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px;">Password Recovery</p>
        </div>
        
        <p style="font-size: 14px; color: #cbd5e1;">Hola <b>{user.name}</b>,</p>
        <p style="font-size: 14px; color: #cbd5e1;">Has solicitado restablecer tu contraseña. Haz clic en el siguiente botón para crear una nueva:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_url}" style="display: inline-block; background: #6366f1; color: white; padding: 16px 32px; text-decoration: none; font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; border-radius: 12px;">
                RESTABLECER CONTRASEÑA
            </a>
        </div>
        
        <p style="font-size: 12px; color: #94a3b8;">Este enlace expirará en <b>1 hora</b>.</p>
        <p style="font-size: 12px; color: #94a3b8;">Si no solicitaste este cambio, ignora este correo.</p>
        
        <div style="border-top: 1px solid #334155; margin-top: 30px; padding-top: 20px;">
            <p style="font-size: 10px; color: #64748b; text-align: center; margin: 0;">
                Aviation Inventory Management System • {datetime.utcnow().strftime('%Y-%m-%d %H:%M')} UTC
            </p>
        </div>
    </div>
    """
    
    try:
        success, message, _ = server_email.send_email(
            to_email=user.email,
            subject="[WCA] Recuperación de Contraseña",
            body=email_body
        )
        logger.info(f"Password reset email sent to {user.email}")
    except Exception as e:
        logger.error(f"Failed to send password reset email: {e}")
    
    return jsonify({"message": "Si el correo está registrado, recibirás instrucciones de recuperación."})


@app.route('/api/admin/reset-password/<user_id>', methods=['POST'])
@token_required
def admin_reset_password(user_id):
    """
    Admin endpoint to reset a user's password directly.
    Requires ADMIN role.
    """
    db = get_db()
    
    # Verify admin privileges
    admin = db.query(User).filter(User.id == request.user_id).first()
    if not admin or admin.role != 'ADMIN':
        return jsonify({"message": "Acceso denegado. Solo administradores."}), 403
    
    # Get target user
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        return jsonify({"message": "Usuario no encontrado"}), 404
    
    data = request.json
    new_password = data.get('password')
    
    if not new_password or len(new_password) < 10:
        return jsonify({"message": "La contraseña debe tener al menos 10 caracteres"}), 400
    
    # Update password
    target_user.password = generate_password_hash(new_password)
    target_user.must_change_password = True  # Force change on next login
    db.commit()
    
    logger.info(f"Admin {admin.name} reset password for user {target_user.name}")
    return jsonify({"message": f"Contraseña de {target_user.name} restablecida. Deberá cambiarla en su próximo inicio de sesión."})


@app.route('/api/admin/resend-invitation/<user_id>', methods=['POST'])
@token_required
def admin_resend_invitation(user_id):
    """
    Admin endpoint to resend setup invitation email.
    Requires ADMIN role.
    """
    db = get_db()
    
    # Verify admin privileges
    admin = db.query(User).filter(User.id == request.user_id).first()
    if not admin or admin.role != 'ADMIN':
        return jsonify({"message": "Acceso denegado. Solo administradores."}), 403
    
    # Get target user
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        return jsonify({"message": "Usuario no encontrado"}), 404
    
    # Generate new setup token (expires in 7 days)
    setup_token = secrets.token_urlsafe(32)
    target_user.setup_token = setup_token
    target_user.setup_token_expiry = datetime.utcnow() + timedelta(days=7)
    target_user.must_change_password = True
    db.commit()
    
    # Build setup URL
    base_url = request.host_url.rstrip('/')
    setup_url = f"{base_url}/#/setup-password?token={setup_token}"
    
    # Send invitation email
    email_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: white; padding: 40px; border-radius: 16px;">
        <div style="background: #1e293b; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
            <h1 style="margin: 0; font-size: 18px; font-weight: 900; letter-spacing: 1px;">WORLD CLASS AVIATION</h1>
            <p style="margin: 5px 0 0 0; font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px;">Account Setup</p>
        </div>
        
        <p style="font-size: 14px; color: #cbd5e1;">Hola <b>{target_user.name}</b>,</p>
        <p style="font-size: 14px; color: #cbd5e1;">Se ha reenviado tu invitación al sistema de inventario. Configura tu contraseña:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{setup_url}" style="display: inline-block; background: #6366f1; color: white; padding: 16px 32px; text-decoration: none; font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; border-radius: 12px;">
                CONFIGURAR MI ACCESO
            </a>
        </div>
        
        <p style="font-size: 12px; color: #94a3b8;">Este enlace expirará en <b>7 días</b>.</p>
        
        <div style="border-top: 1px solid #334155; margin-top: 30px; padding-top: 20px;">
            <p style="font-size: 10px; color: #64748b; text-align: center; margin: 0;">
                Aviation Inventory Management System • {datetime.utcnow().strftime('%Y-%m-%d %H:%M')} UTC
            </p>
        </div>
    </div>
    """
    
    try:
        success, message, _ = server_email.send_email(
            to_email=target_user.email,
            subject="[WCA] Invitación de Acceso Reenviada",
            body=email_body
        )
        if success:
            logger.info(f"Admin {admin.name} resent invitation to {target_user.email}")
            return jsonify({"message": f"Invitación reenviada a {target_user.email}"})
        else:
            return jsonify({"message": f"Error al enviar: {message}"}), 500
    except Exception as e:
        logger.error(f"Failed to send invitation: {e}")
        return jsonify({"message": "Error al enviar la invitación"}), 500

# --- ENDPOINTS DE INVENTARIO ---

@app.route('/api/inventory', methods=['GET'])
@token_required
def get_inventory():
    db = get_db()
    parts = db.query(AviationPart).all()
    return jsonify([part_to_camel_dict(p) for p in parts])

@app.route('/api/inventory', methods=['POST'])
@token_required
def save_inventory():
    data = request.json
    db = get_db()
    for part_data_camel in data:
        part_data = {to_snake_case(k): v for k, v in part_data_camel.items()}
        part_id = part_data.get('id')
        part = db.query(AviationPart).filter(AviationPart.id == part_id).first()
        if not part: 
            part = AviationPart(id=part_id)
            db.add(part)
        for key, value in part_data.items():
            if hasattr(part, key): 
                setattr(part, key, value)
    db.commit()
    return jsonify({"message": "Inventario sincronizado."})

# --- ENDPOINTS DE GESTIÓN (ADMIN) ---

@app.route('/api/users', methods=['GET'])
@token_required
def get_users():
    db = get_db()
    users = db.query(User).all()
    return jsonify([user_to_dict(u) for u in users])

@app.route('/api/users', methods=['POST'])
@token_required
def create_user():
    data = request.json
    db = get_db()
    if db.query(User).filter(func.lower(User.username) == data.get('username','').lower()).first():
        return jsonify({"message": "El nombre de usuario ya existe"}), 409
    
    role = data.get('role', 'TECHNICIAN')
    send_credentials = data.get('sendCredentials', False)
    
    setup_token = str(uuid.uuid4())
    expiry = datetime.utcnow() + timedelta(hours=1)
    
    new_user = User(
        id=str(uuid.uuid4()),
        name=data.get('name'),
        username=data.get('username'),
        email=data.get('email'),
        role=role,
        password=None, # Sin clave inicial
        active=True,
        suspended=False,
        must_change_password=True,
        setup_token=setup_token,
        setup_token_expiry=expiry
    )
    db.add(new_user)
    db.commit()
    
    email_status = None
    if send_credentials and new_user.email:
        try:
            cfg = server_email.load_config()
            subject = "Configuración de Cuenta - Control inventario"
            origin = request.headers.get('Origin', 'http://localhost:5173')
            setup_link = f"{origin}/?setupToken={setup_token}"
            
            html_body = f"""
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 20px; padding: 32px; background-color: #ffffff;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <h1 style="color: #4f46e5; margin: 0; font-size: 24px; text-transform: uppercase; font-weight: 900;">Control inventario</h1>
                </div>
                <p style="color: #1e293b; font-size: 16px;">Hola <strong>{new_user.name}</strong>,</p>
                <p style="color: #475569; line-height: 1.6;">Se ha creado una cuenta para ti en el sistema de gestión operacional. Para comenzar, debes configurar tu contraseña de acceso.</p>
                
                <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin: 24px 0; border: 1px solid #f1f5f9; text-align: center;">
                    <p style="margin: 0 0 12px 0; font-size: 14px; color: #64748b; text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em;">Nombre de Usuario</p>
                    <p style="margin: 0; font-size: 18px; color: #1e293b; font-weight: bold;">{new_user.username}</p>
                </div>

                <div style="text-align: center; margin: 32px 0;">
                    <a href="{setup_link}" style="background-color: #4f46e5; color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; display: inline-block;">Configurar mi Contraseña</a>
                </div>

                <p style="color: #94a3b8; font-size: 12px; text-align: center;">Este enlace es válido por 1 hora. Si expira, contacta al administrador.</p>
                <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 32px 0;" />
                <p style="font-size: 12px; color: #cbd5e1; text-align: center;">Control inventario - Terminal Operacional</p>
            </div>
            """
            success, msg = server_email.send_via_smtp(cfg, new_user.email, subject, html_body)
            email_status = {"success": success, "message": msg}
        except Exception as e:
            logger.error(f"Error enviando email de configuración: {e}")
            email_status = {"success": False, "message": str(e)}

    return jsonify({"user": user_to_dict(new_user), "email_status": email_status}), 201

@app.route('/api/users/<string:user_id>', methods=['PUT'])
@token_required
def update_user(user_id):
    data = request.json
    db = get_db()
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return jsonify({"message": "Usuario no encontrado"}), 404
    
    for key, value in data.items():
        if key != 'password' and hasattr(user, key):
            setattr(user, key, value)
    
    db.commit()
    return jsonify(user_to_dict(user))

@app.route('/api/users/<string:user_id>', methods=['DELETE'])
@token_required
def delete_user(user_id):
    db = get_db()
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return jsonify({"message": "Usuario no encontrado"}), 404
    
    db.delete(user)
    db.commit()
    return jsonify({"message": "Usuario eliminado"}), 200

@app.route('/api/users/generate-password', methods=['GET'])
@token_required
def get_secure_password():
    return jsonify({"password": generate_secure_password()})

@app.route('/api/send-email', methods=['POST'])
@token_required
def handle_send_email():
    data = request.json
    recipient = data.get('recipient')
    subject = data.get('subject')
    html_body = data.get('html_body')
    attachments = data.get('attachments')  # Optional: dict with CID -> base64 image data
    
    if not recipient or not subject or not html_body:
        return jsonify({"message": "Faltan datos requeridos (recipient, subject, html_body)"}), 400

    cfg = server_email.load_config()
    # Diagnostic logs container using a list
    logs = []
    
    success, message = server_email.send_via_smtp(cfg, recipient, subject, html_body, diagnostic_logs=logs, attachments=attachments)
    
    if success: 
        return jsonify({"message": message, "logs": logs}), 200
    
    # Log failure with more details
    logger.error(f"Email failed to {recipient}: {message}")
    return jsonify({"message": message, "logs": logs}), 500

@app.route('/api/users/setup-password', methods=['POST'])
def setup_password():
    data = request.json
    token = data.get('token')
    new_password = data.get('password')
    
    if not token or not new_password:
        return jsonify({"message": "Datos de configuración incompletos."}), 400
        
    db = get_db()
    user = db.query(User).filter(User.setup_token == token).first()
    
    if not user:
        return jsonify({"message": "Token inválido o cuenta ya configurada."}), 404
        
    if user.setup_token_expiry < datetime.utcnow():
        return jsonify({"message": "El token de configuración ha expirado."}), 401
    
    # Actualizar clave y limpiar token
    user.password = generate_password_hash(new_password)
    user.must_change_password = False
    user.setup_token = None
    user.setup_token_expiry = None
    db.commit()
    
    return jsonify({"success": True, "message": "Contraseña configurada exitosamente. Ya puedes iniciar sesión."})

# --- ENDPOINTS DE CONFIGURACIÓN Y MANTENIMIENTO ---

@app.route('/api/email-config', methods=['GET', 'POST'])
@token_required
def email_config():
    if request.method == 'POST':
        with open(server_email.CONFIG_PATH, 'w') as f: 
            json.dump(request.json, f)
        return jsonify({"message": "Configuración guardada."})
    return jsonify(server_email.load_config())

@app.route('/api/email-test', methods=['POST'])
@token_required
def email_test():
    db = get_db()
    user = db.query(User).filter(User.id == request.user_id).first()
    
    if user.role != 'ADMIN':
        return jsonify({"message": "Acceso denegado."}), 403

    cfg = request.json
    logs = []
    subject = "Prueba de Conexión - AeroLogistics Pro"
    html_body = f"""
    <div style="font-family: sans-serif; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
        <h2 style="color: #4f46e5;">Prueba de Servidor Exitosa</h2>
        <p>Este es un correo de prueba enviado desde el panel de configuración de <strong>AeroLogistics Pro</strong>.</p>
        <p>Si has recibido esto, tu configuración SMTP es correcta.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 10px; color: #94a3b8;">Timestamp: {datetime.utcnow().isoformat()}</p>
    </div>
    """
    
    success, message = server_email.send_via_smtp(cfg, cfg.get('smtp_user'), subject, html_body, diagnostic_logs=logs)
    
    return jsonify({
        "success": success,
        "message": message,
        "logs": logs
    })

@app.route('/api/db-backup', methods=['GET'])
@token_required
def db_backup():
    db = get_db()
    parts = db.query(AviationPart).all()
    backup_data = [part_to_camel_dict(p) for p in parts]
    backup_file = "/tmp/backup.json"
    with open(backup_file, 'w') as f: 
        json.dump(backup_data, f, indent=2)
    return send_file(backup_file, as_attachment=True)

@app.route('/api/db-optimize', methods=['POST'])
@token_required
def db_optimize():
    db = get_db()
    try:
        db.execute(text("VACUUM FULL"))
        db.commit()
        return jsonify({"status": "optimized", "message": "VACUUM FULL ejecutado."})
    except Exception as e:
        db.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

# --- ENDPOINTS DE IA Y ESTADÍSTICAS ---
@app.route('/api/stats', methods=['GET'])
@token_required
def get_stats():
    db = get_db()
    by_tag = db.query(AviationPart.tag_color, func.count(AviationPart.id)).group_by(AviationPart.tag_color).all()
    by_loc = db.query(AviationPart.location, func.count(AviationPart.id)).group_by(AviationPart.location).all()
    return jsonify({"by_tag": dict(by_tag), "by_location": dict(by_loc)})

@app.route('/api/stats/brands', methods=['GET'])
@token_required
def get_brand_stats():
    db = get_db()
    brand_stats = db.query(AviationPart.brand, func.count(AviationPart.id)) \
        .filter(AviationPart.brand != None, AviationPart.brand != '') \
        .group_by(AviationPart.brand) \
        .order_by(func.count(AviationPart.id).desc()) \
        .limit(10).all()
    return jsonify(dict(brand_stats))

@app.route('/api/stats/location-breakdown', methods=['GET'])
@token_required
def get_location_breakdown():
    location = request.args.get('loc')
    if not location:
        return jsonify({"error": "Ubicación (loc) es requerida"}), 400
    
    db = get_db()
    breakdown = db.query(AviationPart.tag_color, func.count(AviationPart.id)) \
        .filter(func.lower(AviationPart.location) == location.lower()) \
        .group_by(AviationPart.tag_color).all()
    
    total = db.query(func.count(AviationPart.id)) \
        .filter(func.lower(AviationPart.location) == location.lower()).scalar() or 0
    
    if total == 0:
        return jsonify({"error": "Ubicación no encontrada o vacía"}), 404
        
    return jsonify({
        "location": location,
        "total": total,
        "breakdown": dict(breakdown)
    })

@app.route('/api/stats/type-breakdown', methods=['GET'])
@token_required
def get_type_breakdown():
    part_type = request.args.get('name')
    if not part_type:
        return jsonify({"error": "Tipo de parte (name) es requerido"}), 400
    
    db = get_db()
    breakdown = db.query(AviationPart.tag_color, func.count(AviationPart.id)) \
        .filter(func.lower(AviationPart.part_name) == part_type.lower()) \
        .group_by(AviationPart.tag_color).all()
    
    total = db.query(func.count(AviationPart.id)) \
        .filter(func.lower(AviationPart.part_name) == part_type.lower()).scalar() or 0
    
    if total == 0:
        return jsonify({"error": "Tipo de parte no encontrado"}), 404
        
    return jsonify({
        "partName": part_type,
        "total": total,
        "breakdown": dict(breakdown)
    })

@app.route('/api/stock-lookup', methods=['GET'])
@token_required
def stock_lookup():
    part_number = request.args.get('pn')
    if not part_number:
        return jsonify({"error": "Part Number (pn) es requerido"}), 400
    
    db = get_db()
    parts_query = db.query(AviationPart).filter(func.lower(AviationPart.pn) == part_number.lower())
    
    first_part = parts_query.first()
    if not first_part:
        return jsonify({"error": "P/N no encontrado en el inventario"}), 404

    breakdown_query = db.query(AviationPart.tag_color, func.count(AviationPart.id)).filter(func.lower(AviationPart.pn) == part_number.lower()).group_by(AviationPart.tag_color).all()
    
    total_count = parts_query.count()
    part_name = first_part.part_name

    return jsonify({
        "partName": part_name,
        "pn": part_number,
        "total": total_count,
        "breakdown": dict(breakdown_query)
    })

# --- ENDPOINTS DE CONTACTOS ---

@app.route('/api/contacts', methods=['GET'])
@token_required
def get_contacts():
    db = get_db()
    contacts = db.query(Contact).order_by(Contact.name).all()
    return jsonify([{
        "id": c.id,
        "name": c.name,
        "email": c.email,
        "organization": c.organization,
        "role": c.role
    } for c in contacts])

@app.route('/api/contacts', methods=['POST'])
@token_required
def create_contact():
    data = request.json
    db = get_db()
    
    # Validation
    if not data.get('email') or not data.get('name'):
        return jsonify({"message": "Nombre y Email requeridos"}), 400

    # duplicados check
    email = data.get('email').lower().strip()
    if db.query(Contact).filter(func.lower(Contact.email) == email).first():
        return jsonify({"message": "Este correo ya está registrado en contactos"}), 409

    new_contact = Contact(
        id=str(uuid.uuid4()),
        name=data.get('name'),
        email=email,
        organization=data.get('organization', ''),
        role=data.get('role', 'EXTERNAL'),
        created_at=datetime.utcnow()
    )
    db.add(new_contact)
    db.commit()
    
    return jsonify({
        "message": "Contacto guardado", 
        "contact": {
            "id": new_contact.id, 
            "name": new_contact.name, 
            "email": new_contact.email,
            "role": new_contact.role
        }
    }), 201

@app.route('/api/contacts/<contact_id>', methods=['DELETE'])
@token_required
def delete_contact(contact_id):
    db = get_db()
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        return jsonify({"message": "Contacto no encontrado"}), 404
    
    db.delete(contact)
    db.commit()
    return jsonify({"message": "Contacto eliminado"}), 200
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
