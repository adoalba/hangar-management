
from flask import Flask, request, jsonify, send_from_directory, send_file, g, Response, Blueprint, current_app
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_compress import Compress
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.exc import SQLAlchemyError
import os
import logging
from logging.handlers import RotatingFileHandler
import uuid
import secrets
import string
import json
from datetime import datetime, timedelta
from functools import wraps
from sqlalchemy import func, text
import re
import base64
import binascii

from .models import SessionLocal, User, UserSession, AviationPart, Contact, Base, engine, DATABASE_URL
from .config import Paths
# from . import server_email # Imported later or global? Better global.
from . import server_email
from .database import get_db, teardown_db, db
from .utils.auth import token_required, generate_secure_password
from flask_login import LoginManager

# Ensure Schema Exists
Base.metadata.create_all(bind=engine)

# STORAGE INTEGRITY CHECK
try:
    from .storage_service import verify_storage_permissions
    verify_storage_permissions()
except ImportError:
    pass

# Ensure Directories
Paths.validate()

# Logging Setup (Global)
# Logging Setup (Global)
log_format = '%(asctime)s [%(levelname)s] %(name)s: %(message)s'
logging.basicConfig(level=logging.INFO, format=log_format)
logger = logging.getLogger(__name__)

# Add File Handler to Root Logger
try:
    file_handler = RotatingFileHandler(Paths.LOG_FILE, maxBytes=10*1024*1024, backupCount=5)
    file_handler.setFormatter(logging.Formatter(log_format))
    logging.getLogger().addHandler(file_handler)
except Exception as e:
    logger.warning(f"No se pudo inicializar el log en archivo {Paths.LOG_FILE}: {e}")

# Extensions (Global)
limiter = Limiter(key_func=get_remote_address, storage_uri="memory://")
login_manager = LoginManager()
login_manager.login_view = "auth_bp.login" # If we had one, but requested list/create/delete

# Blueprint
# Blueprint
main_bp = Blueprint('main', __name__)
from .auth.routes import auth_bp
from .auth.init import init_auth_system
from .auth.models import User as SystemUser

# --- ADMIN SEED LOGIC (IDEMPOTENT) ---
def seed_admin_user():
    """
    Creates an initial Admin user if one does not exist.
    Strictly adheres to: IF EXISTS, DO NOT TOUCH.
    """
    try:
        db = SessionLocal()
        # Check if ANY admin exists
        admin_exists = db.query(User).filter(User.role == 'admin').first()
        
        if not admin_exists:
            logger.info("SEED: No admin found. Creating default 'admin' user.")
            
            # Create Default Admin
            # Password must satisfy policy: 10+, 1 Upper, 1 Num, 1 Symbol
            default_pass = "HangarAdmin2026!" 
            
            admin = User(
                id=str(uuid.uuid4()),
                name="Súper Admin",
                username="admin",
                email="admin@aerologistics.pro",
                role="admin",
                active=True,
                must_change_password=True # Force change on first login
            )
            admin.set_password(default_pass)
            
            db.add(admin)
            db.commit()
            logger.warning(f"SEED: Created 'admin'. Password: {default_pass}")
        else:
            logger.info("SEED: Admin exists. Skipping seed.")
            
        db.close()
    except Exception as e:
        logger.error(f"SEED ERROR: {e}")

# Run Seed (Moved to create_app)
# with main_bp.record_once(lambda s: seed_admin_user()):
#    pass

# --- CARD BACKUP CONFIGURATION ---
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
CARDS_BACKUP_DIR = os.path.join(BASE_DIR, '..', 'storage', 'cards_backup')
SCAN_LOGS_DIR = os.path.join(BASE_DIR, '..', 'storage', 'scan_logs')

def backup_single_card(card_data):
    """Saves a JSON snapshot of a single component card to disk"""
    try:
        # 1. Create Folder Structure (Year-Month)
        date_folder = datetime.now().strftime('%Y-%m')
        target_dir = os.path.join(CARDS_BACKUP_DIR, date_folder)
        if not os.path.exists(target_dir):
            os.makedirs(target_dir, exist_ok=True)

        # 2. Sanitize Filename (PN + SN)
        pn = str(card_data.get('pn', 'UNKNOWN')).replace('/', '-').replace(' ', '_').strip()
        sn = str(card_data.get('sn', 'NO-SN')).replace('/', '-').replace(' ', '_').strip()
        
        # Limit filename length to avoid filesystem issues
        pn = pn[:50] if len(pn) > 50 else pn
        sn = sn[:50] if len(sn) > 50 else sn
        
        filename = f"{pn}_{sn}.json"
        
        # 3. Prepare data with metadata
        backup_data = {
            'metadata': {
                'backed_up_at': datetime.utcnow().isoformat(),
                'pn': card_data.get('pn'),
                'sn': card_data.get('sn')
            },
            'data': card_data
        }
        
        # 4. Save File
        file_path = os.path.join(target_dir, filename)
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(backup_data, f, indent=2, ensure_ascii=False)
            
        logger.info(f"✓ CARD BACKUP: {filename}")
        
    except Exception as e:
        logger.error(f"✗ CARD BACKUP FAILED: {e}")

# --- HELPER: SAVE SCAN LOG ---
def log_scan_event(part_data, action_type, user_name):
    """
    Saves a forensic log of the scanning event (Double Scan Validation).
    """
    try:
        # 1. Prepare Directory
        date_folder = datetime.now().strftime('%Y-%m')
        target_dir = os.path.join(SCAN_LOGS_DIR, date_folder)
        if not os.path.exists(target_dir):
            os.makedirs(target_dir, exist_ok=True)

        # 2. Sanitize Identifiers
        pn = str(part_data.get('pn', 'UNKNOWN')).replace('/', '-').strip()
        sn = str(part_data.get('sn', 'NO-SN')).replace('/', '-').strip()
        timestamp_str = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
        
        # 3. Filename: SCAN_{Action}_{PN}_{SN}_{Time}.json
        filename = f"SCAN_{action_type}_{pn}_{sn}_{timestamp_str}.json"
        file_path = os.path.join(target_dir, filename)

        # 4. Capture Environment (Digital Fingerprint)
        client_ip = request.remote_addr
        user_agent = request.headers.get('User-Agent')

        # 5. Construct Double Scan Record
        scan_record = {
            "record_id": f"REC-{timestamp_str}",
            "timestamp": datetime.now().isoformat(),
            "scan_type": "DOUBLE_VERIFICATION", # System Standard
            "action": action_type, # UPDATE, CREATE, MOVE
            
            # FACTOR 1: THE USER (Who scanned)
            "operator": {
                "user_name": user_name,
                "ip_address": client_ip,
                "device_fingerprint": user_agent
            },
            
            # FACTOR 2: THE ITEM (What was scanned)
            "component": {
                "part_number": pn,
                "serial_number": sn,
                "location_context": part_data.get('location', 'UNKNOWN'),
                "condition_context": part_data.get('condition', 'UNKNOWN')
            },
            
            # SYSTEM INTEGRITY
            "status": "VALIDATED",
            "server_node": "ANTIGRAVITY-PRIMARY"
        }

        # 6. Write File
        with open(file_path, "w") as f:
            json.dump(scan_record, f, indent=4)
            
        logger.info(f"📠 SCAN LOGGED: {filename}")

    except Exception as e:
        logger.error(f"⚠️ SCAN LOG ERROR: {e}")

# Placeholders for missing functions to prevent crash if not defined elsewhere
def backup_component_image(part_data):
    # Placeholder: Implement image saving logic here if needed
    pass

def backup_movement_event(part_data, old_loc, new_loc, user):
    # Placeholder: Implement movement logging logic here if needed
    pass

# Helper: Pre-Flight
def perform_preflight_checks():
    logger.info("--- INICIANDO PROTOCOLO DE PRE-VUELO (STARTUP CHECKS) ---")
    try:
        if not os.access(Paths.STORAGE_ROOT, os.W_OK):
             raise PermissionError(f"No write access to {Paths.STORAGE_ROOT}")
        logger.info(f"[CHECK] Storage Write Access: OK ({Paths.STORAGE_ROOT})")
    except Exception as e:
        logger.critical(f"[CHECK] Storage Failure: {e}")
    
    try:
        if not os.path.exists(Paths.DB_PATH):
             logger.warning(f"[CHECK] Database file not found at {Paths.DB_PATH}")
        else:
             logger.info(f"[CHECK] Database file detected at {Paths.DB_PATH}")
        with engine.connect() as connection:
             connection.execute(text("SELECT 1"))
             logger.info("[CHECK] Database Connectivity: OK")
    except Exception as e:
        logger.critical(f"[CHECK] DATABASE CRITICAL FAILURE: {e}")
    logger.info("--- PRE-VUELO COMPLETADO ---")

# Error Handlers (Attach to Blueprint)
@main_bp.app_errorhandler(SQLAlchemyError)
def handle_db_error(e):
    logger.error(f"Database error: {str(e)}")
    return jsonify({"message": "Error interno de base de datos"}), 500

@main_bp.app_errorhandler(404)
def not_found(e):
    return jsonify({"message": "Recurso no encontrado"}), 404

@main_bp.app_errorhandler(500)
def server_error(e):
    return jsonify({"message": "Error interno del servidor"}), 500

def create_app():
    app = Flask(__name__)
    CORS(app)
    Compress(app)
    app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-123')
    
    # Init Extensions
    limiter.init_app(app)
    db.init_app(app)
    login_manager.init_app(app)
    
    @login_manager.user_loader
    def load_user(user_id):
        return SystemUser.query.get(int(user_id))
    
    # Teardown
    app.teardown_appcontext(teardown_db)
    
    # Register Blueprints
    from .reports import reports_bp
    app.register_blueprint(reports_bp)
    
    from .reports_v2 import reports_v2_bp
    app.register_blueprint(reports_v2_bp)
    
    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp) # New Auth System
    
    # LEGACY COMPATIBILITY: Map /api/login to the new auth logic
    from .auth.routes import login as auth_login
    app.add_url_rule('/api/login', view_func=auth_login, methods=['POST'])

    # Pre-Flight
    with app.app_context():
        perform_preflight_checks()
        try:
            from .utils.db_migrator import check_and_migrate_db
            check_and_migrate_db()
        except Exception as e:
            logger.error(f"Migration Failed: {e}")
        # seed_admin_user() # Legacy
        init_auth_system(app, db) # Architect mandated system + seeding
        
    return app



# Routes
@main_bp.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "timestamp": datetime.utcnow().isoformat()}), 200

# --- MIDDLEWARE DE SEGURIDAD Y HELPERS ---

def to_camel_case(snake_str):
    return re.sub(r'_([a-z])', lambda x: x.group(1).upper(), snake_str)

def to_snake_case(camel_str):
    return re.sub(r'(?<!^)(?=[A-Z])', '_', camel_str).lower()

def part_to_camel_dict(part):
    d = {c.name: getattr(part, c.name) for c in part.__table__.columns}
    return {to_camel_case(k): v for k, v in d.items()}

# --- ENDPOINTS DE USUARIO Y SESIÓN ---

@main_bp.route('/api/login-check', methods=['POST'])
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

@main_bp.route('/api/update-password', methods=['POST'])
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


@main_bp.route('/api/forgot-password', methods=['POST'])
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


@main_bp.route('/api/admin/reset-password/<user_id>', methods=['POST'])
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


@main_bp.route('/api/admin/resend-invitation/<user_id>', methods=['POST'])
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

@main_bp.route('/api/inventory', methods=['GET'])
@token_required
def get_inventory():
    db = get_db()
    
    # Optimized Streaming Response for Large Datasets
    # Prevents Gunicorn WorkerTimeout on large payloads
    def generate():
        yield '['
        is_first = True
        
        # Use yield_per to fetch in chunks from DB cursor server-side
        # 500 items per batch to keep memory profile low
        query = db.query(AviationPart).yield_per(500)
        
        for part in query:
            if not is_first:
                yield ','
            is_first = False
            yield json.dumps(part_to_camel_dict(part))
        yield ']'

    return Response(generate(), mimetype='application/json')

@main_bp.route('/api/inventory', methods=['POST'])
@token_required
def save_inventory():
    """ Atomic Inventory Sync: DB + JSON + IMG + MOVEMENT + SCAN LOG """
    data = request.json
    if not isinstance(data, list):
         return jsonify({"message": "Expected a list of items"}), 400
         
    db = get_db()
    current_user = getattr(request, 'user_name', 'Admin') 
    
    try:
        updated_count = 0
        created_count = 0
        
        for part_data_camel in data:
            # Snake Case Conversion
            part_data = {to_snake_case(k): v for k, v in part_data_camel.items()}
            
            pn = part_data.get('pn')
            sn = part_data.get('sn')
            if not pn: continue 

            # DB Lookup
            existing_part = db.query(AviationPart).filter(AviationPart.pn == pn, AviationPart.sn == sn).first()
            
            # --- 1. DETERMINE ACTION TYPE ---
            action_type = "UPDATE" if existing_part else "CREATE"
            
            # --- 2. EXECUTE BACKUP SUITE ---
            # A. Traceability (Movements)
            if existing_part:
                old_loc = str(existing_part.location).strip()
                new_loc = str(part_data.get('location', '')).strip()
                if old_loc != new_loc and (old_loc or new_loc):
                    backup_movement_event(part_data, old_loc, new_loc, current_user)
                    action_type = "TRANSFER" # Elevate action type if moved

            # B. Data Snapshot (Card)
            backup_single_card(part_data)
            
            # C. Visual Evidence (Image)
            backup_component_image(part_data)
            
            # D. SCAN LOG (The Double Scan Record) <--- NEW
            log_scan_event(part_data, action_type, current_user)
            # ---------------------------------------------

            # 3. DB UPSERT (Existing Logic)
            if not existing_part: 
                part_id = part_data.get('id') or f"PART-{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}"
                existing_part = AviationPart(id=part_id)
                db.add(existing_part)
                created_count += 1
            else:
                updated_count += 1
            
            for key, value in part_data.items():
                if hasattr(existing_part, key) and key != 'id':
                    setattr(existing_part, key, value)
        
        db.commit()
        return jsonify({
            "message": "Operación de escaneo registrada y procesada.", 
            "created": created_count, 
            "updated": updated_count
        })
        
    except Exception as e:
        db.rollback()
        return jsonify({"message": "Error crítico.", "error": str(e)}), 500


# User management endpoints moved to auth/routes.py

@main_bp.route('/api/send-email', methods=['POST'])
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

# Password setup moved to auth/routes.py

# --- ENDPOINTS DE CONFIGURACIÓN Y MANTENIMIENTO ---

@main_bp.route('/api/email-config', methods=['GET', 'POST'])
@token_required
def email_config():
    if request.method == 'POST':
        with open(server_email.CONFIG_PATH, 'w') as f: 
            json.dump(request.json, f)
        return jsonify({"message": "Configuración guardada."})
    return jsonify(server_email.load_config())

@main_bp.route('/api/email-test', methods=['POST'])
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

@main_bp.route('/api/db-backup', methods=['GET'])
@token_required
def db_backup():
    db = get_db()
    parts = db.query(AviationPart).all()
    backup_data = [part_to_camel_dict(p) for p in parts]
    backup_file = "/tmp/backup.json"
    with open(backup_file, 'w') as f: 
        json.dump(backup_data, f, indent=2)
    return send_file(backup_file, as_attachment=True)

@main_bp.route('/api/db-optimize', methods=['POST'])
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
@main_bp.route('/api/stats', methods=['GET'])
@token_required
def get_stats():
    db = get_db()
    by_tag = db.query(AviationPart.tag_color, func.count(AviationPart.id)).group_by(AviationPart.tag_color).all()
    by_loc = db.query(AviationPart.location, func.count(AviationPart.id)).group_by(AviationPart.location).all()
    return jsonify({"by_tag": dict(by_tag), "by_location": dict(by_loc)})

@main_bp.route('/api/stats/brands', methods=['GET'])
@token_required
def get_brand_stats():
    db = get_db()
    brand_stats = db.query(AviationPart.brand, func.count(AviationPart.id)) \
        .filter(AviationPart.brand != None, AviationPart.brand != '') \
        .group_by(AviationPart.brand) \
        .order_by(func.count(AviationPart.id).desc()) \
        .limit(10).all()
    return jsonify(dict(brand_stats))

@main_bp.route('/api/stats/location-breakdown', methods=['GET'])
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

@main_bp.route('/api/stats/type-breakdown', methods=['GET'])
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

@main_bp.route('/api/stock-lookup', methods=['GET'])
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

@main_bp.route('/api/contacts', methods=['GET'])
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

@main_bp.route('/api/contacts', methods=['POST'])
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

@main_bp.route('/api/contacts/<contact_id>', methods=['DELETE'])
@token_required
def delete_contact(contact_id):
    db = get_db()
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        return jsonify({"message": "Contacto no encontrado"}), 404
    
    db.delete(contact)
    db.commit()
    return jsonify({"message": "Contacto eliminado"}), 200

# GLOBAL APP INSTANCE (For Gunicorn)
app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
