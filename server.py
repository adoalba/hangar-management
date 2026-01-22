
from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_compress import Compress
from werkzeug.security import generate_password_hash, check_password_hash
import os
import logging
import uuid
import secrets
import string
import json
from datetime import datetime, timedelta
from functools import wraps
from sqlalchemy import func, text
from google.generativeai import GenerativeModel, configure
import re

from models import SessionLocal, User, UserSession, AviationPart
import server_email # Módulo de envío de correo

# --- CONFIGURACIÓN ESTRUCTURAL ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

try:
    configure(api_key=os.environ.get("API_KEY"))
    GEMINI_MODEL = GenerativeModel('gemini-1.5-flash-latest')
    logger.info("✅ Gemini AI SDK configurado correctamente.")
except Exception as e:
    GEMINI_MODEL = None
    logger.error(f"❌ Error al configurar Gemini AI SDK: {e}")

# --- APP SETUP ---
app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)
Compress(app)

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["2000 per day", "500 per hour"],
    storage_uri="memory://"
)

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
        db = SessionLocal()
        session_record = db.query(UserSession).filter(UserSession.token == token).first()
        
        if not session_record or session_record.expiry < datetime.utcnow():
            if session_record: db.delete(session_record); db.commit()
            db.close()
            return jsonify({"message": "Sesión inválida o expirada"}), 401
        
        request.user_id = session_record.user_id
        db.close()
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
    return {"id": user.id, "name": user.name, "username": user.username, "email": user.email, "role": user.role, "active": user.active, "suspended": user.suspended}

# --- ENDPOINTS DE USUARIO Y SESIÓN ---

@app.route('/api/login-check', methods=['POST'])
@limiter.limit("5 per minute")
def login_check():
    data = request.json
    username = data.get('username', '').lower().strip()
    password = data.get('password', '')
    
    db = SessionLocal()
    user = db.query(User).filter(func.lower(User.username) == username).first()
    
    if user and check_password_hash(user.password, password):
        if user.suspended or not user.active:
            db.close(); return jsonify({"message": "Cuenta restringida."}), 403
            
        token = str(uuid.uuid4())
        db.query(UserSession).filter(UserSession.user_id == user.id).delete()
        new_session = UserSession(token=token, user_id=user.id, expiry=datetime.utcnow() + timedelta(hours=8))
        db.add(new_session)
        db.commit()
        
        user_data = {"id": user.id, "name": user.name, "role": user.role, "mustChangePassword": user.must_change_password}
        db.close()
        return jsonify({"status": "success", "token": token, "user": user_data})
    
    db.close()
    return jsonify({"message": "Credenciales de acceso incorrectas"}), 401

@app.route('/api/update-password', methods=['POST'])
@token_required
def update_password():
    data = request.json
    new_password = data.get('password')
    
    db = SessionLocal()
    user = db.query(User).filter(User.id == request.user_id).first()
    if user:
        user.password = generate_password_hash(new_password)
        user.must_change_password = False
        db.commit()
        db.close()
        return jsonify({"message": "Contraseña actualizada."})
    
    db.close()
    return jsonify({"message": "Usuario no encontrado"}), 404

# --- ENDPOINTS DE INVENTARIO ---

@app.route('/api/inventory', methods=['GET'])
@token_required
def get_inventory():
    db = SessionLocal()
    parts = db.query(AviationPart).all()
    result = [part_to_camel_dict(p) for p in parts]
    db.close()
    return jsonify(result)

@app.route('/api/inventory', methods=['POST'])
@token_required
def save_inventory():
    data = request.json
    db = SessionLocal()
    for part_data_camel in data:
        part_data = {to_snake_case(k): v for k, v in part_data_camel.items()}
        part_id = part_data.get('id')
        part = db.query(AviationPart).filter(AviationPart.id == part_id).first()
        if not part: part = AviationPart(id=part_id); db.add(part)
        for key, value in part_data.items():
            if hasattr(part, key): setattr(part, key, value)
    db.commit()
    db.close()
    return jsonify({"message": "Inventario sincronizado."})

# --- ENDPOINTS DE GESTIÓN (ADMIN) ---

@app.route('/api/users', methods=['GET'])
@token_required
def get_users():
    db = SessionLocal()
    users = db.query(User).all()
    db.close()
    return jsonify([user_to_dict(u) for u in users])

@app.route('/api/users', methods=['POST'])
@token_required
def create_user():
    data = request.json
    db = SessionLocal()
    if db.query(User).filter(func.lower(User.username) == data.get('username','').lower()).first():
        db.close()
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
            
            # Nota: En un entorno real, BASE_URL vendría de config. 
            # Aquí usamos el origin de la petición o localhost:5173 por defecto.
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

    user_dict = user_to_dict(new_user)
    db.close()
    return jsonify({"user": user_dict, "email_status": email_status}), 201

@app.route('/api/users/<string:user_id>', methods=['PUT'])
@token_required
def update_user(user_id):
    data = request.json
    db = SessionLocal()
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        db.close()
        return jsonify({"message": "Usuario no encontrado"}), 404
    
    for key, value in data.items():
        if key != 'password' and hasattr(user, key):
            setattr(user, key, value)
    
    db.commit()
    user_dict = user_to_dict(user)
    db.close()
    return jsonify(user_dict)

@app.route('/api/users/<string:user_id>', methods=['DELETE'])
@token_required
def delete_user(user_id):
    db = SessionLocal()
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        db.close()
        return jsonify({"message": "Usuario no encontrado"}), 404
    
    db.delete(user)
    db.commit()
    db.close()
    return jsonify({"message": "Usuario eliminado"}), 200

@app.route('/api/users/generate-password', methods=['GET'])
@token_required
def get_secure_password():
    return jsonify({"password": generate_secure_password()})

@app.route('/api/send-email', methods=['POST'])
@token_required
def handle_send_email():
    data = request.json
    cfg = server_email.load_config()
    success, message = server_email.send_via_smtp(cfg, data['recipient'], data['subject'], data['html_body'])
    if success: return jsonify({"message": message}), 200
    return jsonify({"message": message}), 500

@app.route('/api/users/setup-password', methods=['POST'])
def setup_password():
    data = request.json
    token = data.get('token')
    new_password = data.get('password')
    
    if not token or not new_password:
        return jsonify({"message": "Datos de configuración incompletos."}), 400
        
    db = SessionLocal()
    user = db.query(User).filter(User.setup_token == token).first()
    
    if not user:
        db.close()
        return jsonify({"message": "Token inválido o cuenta ya configurada."}), 404
        
    if user.setup_token_expiry < datetime.utcnow():
        db.close()
        return jsonify({"message": "El token de configuración ha expirado."}), 401
    
    # Actualizar clave y limpiar token
    user.password = generate_password_hash(new_password)
    user.must_change_password = False
    user.setup_token = None
    user.setup_token_expiry = None
    
    db.commit()
    db.close()
    
    return jsonify({"success": True, "message": "Contraseña configurada exitosamente. Ya puedes iniciar sesión."})

# --- ENDPOINTS DE CONFIGURACIÓN Y MANTENIMIENTO ---

@app.route('/api/email-config', methods=['GET', 'POST'])
@token_required
def email_config():
    if request.method == 'POST':
        with open(server_email.CONFIG_PATH, 'w') as f: json.dump(request.json, f)
        return jsonify({"message": "Configuración guardada."})
    return jsonify(server_email.load_config())

@app.route('/api/email-test', methods=['POST'])
@token_required
def email_test():
    db = SessionLocal()
    user = db.query(User).filter(User.id == request.user_id).first()
    db.close()
    
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
    db = SessionLocal()
    parts = db.query(AviationPart).all()
    backup_data = [part_to_camel_dict(p) for p in parts]
    backup_file = "backup.json"
    with open(backup_file, 'w') as f: json.dump(backup_data, f, indent=2)
    db.close()
    return send_file(backup_file, as_attachment=True)

@app.route('/api/db-optimize', methods=['POST'])
@token_required
def db_optimize():
    db = SessionLocal()
    try:
        db.execute(text("VACUUM FULL"))
        db.commit()
        return jsonify({"status": "optimized", "message": "VACUUM FULL ejecutado."})
    except Exception as e:
        db.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        db.close()

# --- ENDPOINTS DE IA Y ESTADÍSTICAS ---
@app.route('/api/stats', methods=['GET'])
@token_required
def get_stats():
    db = SessionLocal()
    by_tag = db.query(AviationPart.tag_color, func.count(AviationPart.id)).group_by(AviationPart.tag_color).all()
    by_loc = db.query(AviationPart.location, func.count(AviationPart.id)).group_by(AviationPart.location).all()
    db.close()
    return jsonify({"by_tag": dict(by_tag), "by_location": dict(by_loc)})

@app.route('/api/stats/brands', methods=['GET'])
@token_required
def get_brand_stats():
    db = SessionLocal()
    brand_stats = db.query(AviationPart.brand, func.count(AviationPart.id)) \
        .filter(AviationPart.brand != None, AviationPart.brand != '') \
        .group_by(AviationPart.brand) \
        .order_by(func.count(AviationPart.id).desc()) \
        .limit(10).all()
    db.close()
    return jsonify(dict(brand_stats))

@app.route('/api/stats/location-breakdown', methods=['GET'])
@token_required
def get_location_breakdown():
    location = request.args.get('loc')
    if not location:
        return jsonify({"error": "Ubicación (loc) es requerida"}), 400
    
    db = SessionLocal()
    breakdown = db.query(AviationPart.tag_color, func.count(AviationPart.id)) \
        .filter(func.lower(AviationPart.location) == location.lower()) \
        .group_by(AviationPart.tag_color).all()
    
    total = db.query(func.count(AviationPart.id)) \
        .filter(func.lower(AviationPart.location) == location.lower()).scalar() or 0
    
    db.close()
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
    
    db = SessionLocal()
    breakdown = db.query(AviationPart.tag_color, func.count(AviationPart.id)) \
        .filter(func.lower(AviationPart.part_name) == part_type.lower()) \
        .group_by(AviationPart.tag_color).all()
    
    total = db.query(func.count(AviationPart.id)) \
        .filter(func.lower(AviationPart.part_name) == part_type.lower()).scalar() or 0
    
    db.close()
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
    
    db = SessionLocal()
    parts_query = db.query(AviationPart).filter(func.lower(AviationPart.pn) == part_number.lower())
    
    first_part = parts_query.first()
    if not first_part:
        db.close()
        return jsonify({"error": "P/N no encontrado en el inventario"}), 404

    breakdown_query = db.query(AviationPart.tag_color, func.count(AviationPart.id)).filter(func.lower(AviationPart.pn) == part_number.lower()).group_by(AviationPart.tag_color).all()
    
    total_count = parts_query.count()
    part_name = first_part.part_name

    db.close()
    
    return jsonify({
        "partName": part_name,
        "pn": part_number,
        "total": total_count,
        "breakdown": dict(breakdown_query)
    })

@app.route('/api/amm-lookup', methods=['GET'])
@token_required
def amm_lookup():
    part_number = request.args.get('pn')
    if not part_number: return jsonify({"error": "Part Number (pn) es requerido"}), 400
    if not GEMINI_MODEL: return jsonify({"error": "El servicio de IA no está disponible"}), 503
    try:
        response = GEMINI_MODEL.generate_content(f"Encuentra el manual AMM o CMM para P/N: {part_number}", tools=[{"google_search": {}}])
        sources = [{"uri": chunk.web.uri, "title": chunk.web.title} for chunk in response.candidates[0].grounding_metadata.grounding_attributions if hasattr(chunk, 'web')]
        return jsonify({"summary": response.text, "sources": sources})
    except Exception as e:
        logger.error(f"Error en consulta a Gemini: {e}")
        return jsonify({"error": "Fallo en la consulta al servicio de IA"}), 500

# --- SERVE FRONTEND ---
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
