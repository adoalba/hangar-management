# IMPORTS
import os
import glob
import base64
from flask import Blueprint, request, jsonify, g, send_file, abort
from datetime import datetime
from functools import wraps
import logging

from .dal import fetch_inventory_safe
from .domain import build_snapshot
from .adapters.pdf import generate_pdf_v2
from .services import save_and_archive_report
from ..models import UserSession, User, SessionLocal

# Import Master Constant from Storage Service
from app.storage_service import STORAGE_BASE_DIR, SNAPSHOT_ROOT

logger = logging.getLogger(__name__)

reports_v2_bp = Blueprint('reports_v2', __name__, url_prefix='/api/reports/v2')

# ... (Auth helpers kept as is) ...

def get_db():
    if 'db' not in g:
        g.db = SessionLocal()
    return g.db

def token_required_v2(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get('Authorization')
        if not auth or not auth.startswith('Bearer '):
            return jsonify({"message": "Unauthorized"}), 401
        
        token = auth.split(" ")[1]
        db = get_db()
        session = db.query(UserSession).filter(UserSession.token == token).first()
        if not session or session.expiry < datetime.utcnow():
            return jsonify({"message": "Session Expired"}), 401
            
        request.user_id = session.user_id
        return f(*args, **kwargs)
    return decorated

def get_current_user_name(user_id):
    try:
        db = get_db()
        user = db.query(User).filter(User.id == user_id).first()
        return user.name if user else 'System'
    except:
        return 'System'


# ... (generate_report_v2 kept as is) ...

@reports_v2_bp.route('/generate', methods=['POST'])
@token_required_v2
def generate_report_v2():
    # 0. DEMOLITION DEBUG SETUP
    import sys
    import io
    
    print(">>> [ALERTA] INICIANDO GENERACIÓN DE REPORTE (MODO ROBUSTO)", file=sys.stderr)
    
    # 1. INPUT HANDLING
    payload = request.json or {}
    print(f">>> [DATOS RECIBIDOS]: {payload.keys() if payload else 'NONE'}", file=sys.stderr)

    filters = payload.get('filters', {})
    report_type = payload.get('reportType', 'TOTAL_INVENTORY')
    user_name = get_current_user_name(getattr(request, 'user_id', None))
    
    # 2. DATA ACQUISITION STRATEGY
    # Strategy A: Use data sent by Frontend (Preferred for WYSIWYG)
    items_data = payload.get('data')

    if items_data and len(items_data) > 0:
        print(f">>> [ESTRATEGIA A]: Usando {len(items_data)} registros enviados por Frontend", file=sys.stderr)
        # Convert dictionaries back to objects/dicts if needed, or build_snapshot handles dicts?
        # build_snapshot expects list of objects or dicts. Let's ensure compatibility.
        # Use them directly.
        items = items_data 
    else:
        # Strategy B: Fallback to DB Fetch (Backend Safety Net)
        print(">>> [ESTRATEGIA B]: Frontend no envió datos. Ejecutando consulta de respaldo a DB...", file=sys.stderr)
        items = fetch_inventory_safe(filters)
        print(f">>> [DB FALLBACK]: Recuperados {len(items)} registros de la base de datos", file=sys.stderr)
    
    if not items:
         print(">>> [ERROR]: No hay datos para generar reporte (ni en payload ni en DB)", file=sys.stderr)
         return jsonify({"error": "No hay datos para generar el reporte"}), 400

    snapshot = build_snapshot(items, filters, user_name, report_type)
    
    # 3. GENERATION
    # The user complained about PDF/Excel. We default to PDF here unless specified otherwise.
    # We use the generate_pdf_v2 adapter.
    pdf_bytes = generate_pdf_v2(snapshot)
    
    # Convert to buffer for send_file
    pdf_buffer = io.BytesIO(pdf_bytes)
    
    # 4. BINARY VERIFICATION
    size = len(pdf_buffer.getvalue())
    print(f">>> [PESO FINAL]: {size} bytes", file=sys.stderr)
    
    if size < 2000:
        print(f">>> [CONTENIDO SOSPECHOSO]: {pdf_buffer.getvalue()[:200]}", file=sys.stderr)
        # Plain text 500 as requested
        return "ERROR: REPORTE CORRUPTO O VACÍO", 500

    # 5. RESPONSE (NO JSONIFY)
    pdf_buffer.seek(0)
    return send_file(
        pdf_buffer,
        as_attachment=True,
        download_name=f"{snapshot['reportId']}.pdf",
        mimetype='application/pdf'
    )


@reports_v2_bp.route('/generate_pdf', methods=['POST'])
@token_required_v2
def generate_pdf_endpoint_v2():
    """
    Stateless PDF Generation + Server Persistence.
    Uses centralized save_and_archive_report logic.
    """
    # 1. DEBUG INPUT (Direct to Console)
    import sys
    print(f">>> DEBUG DATA RECEIVED: {request.json}", file=sys.stderr)
    
    payload = request.json or {}
    filters = payload.get('filters', {})
    rtype = payload.get('reportType', 'TOTAL')
    user = get_current_user_name(getattr(request, 'user_id', None))
    
    # INPUT AUDIT
    input_data = payload.get('data', [])
    print(f">>> DATA_IN_REPORTS: {type(input_data)} | count: {len(input_data)}", file=sys.stderr)
    
    items = fetch_inventory_safe(filters)
    print(f">>> REGISTROS RECIBIDOS PARA REPORTE (DB FETCH): {len(items)}", file=sys.stderr)
    
    snapshot = build_snapshot(items, filters, user, rtype)
    
    pdf_bytes = generate_pdf_v2(snapshot)
    pdf_size = len(pdf_bytes)
    
    print(f">>> TAMAÑO DEL REPORTE GENERADO: {pdf_size} bytes", file=sys.stderr)
    
    # VALIDATION: Strict 2KB Floor with Content Dump
    if pdf_size < 2000:
         error_content = pdf_bytes[:2000].decode('utf-8', errors='ignore')
         print(f">>> ERROR REAL DETECTADO (PAYLOAD DUMP): {error_content}", file=sys.stderr)
         raise ValueError(f"Generación corrupta. Tamaño: {pdf_size} bytes. Ver logs para contenido.")

    # PERSISTENCE (Transactional)
    report_id = snapshot['reportId']
    filename = f"{report_id}.pdf"
    db = get_db()
    
    # We DO NOT catch persistence errors, we let them fail noisily
    # Logic updated in previous turn to accept card_type
    archive = save_and_archive_report(
        db=db,
        report_id=report_id,
        filename=filename,
        pdf_bytes=pdf_bytes,
        user_id=getattr(request, 'user_id', None),
        card_type=rtype # Uses Dynamic Hierarchy
    )
    saved = True
    filepath = archive.file_path

    encoded = base64.b64encode(pdf_bytes).decode('utf-8')
    
    return jsonify({
        'reportId': report_id,
        'pdfBase64': encoded,
        'archived': saved,
        'archivePath': filepath
    })


@reports_v2_bp.route('/archives', methods=['GET'])
@token_required_v2
def list_archives():
    """
    List valid PDF reports stored in server archive (Manual + Daily Snapshots).
    Offline/History Access.
    """
    try:
        # 1. Manual Archives (Recursive scan in absolute STORAGE_BASE_DIR)
        manual_files = glob.glob(os.path.join(STORAGE_BASE_DIR, "**", "*.pdf"), recursive=True)
        
        # 2. Daily Snapshots (from SNAPSHOT_ROOT)
        snapshot_files = glob.glob(os.path.join(SNAPSHOT_ROOT, "**", "*.pdf"), recursive=True)
        
        all_files = manual_files + snapshot_files
        all_files.sort(key=os.path.getmtime, reverse=True)
        
        # Parent of STORAGE_BASE_DIR is /app/storage
        # We want path keys relative to /app/storage so frontend can request download
        # if we serve /app/storage static/download.
        STORAGE_ROOT_PARENT = os.path.dirname(STORAGE_BASE_DIR) # /app/storage
        
        archives = []
        for f in all_files:
            try:
                stat = os.stat(f)
                is_snapshot = "daily_snapshots" in f
                
                # Relative Path Logic
                # f = /app/storage/archives/SERV/2026/01/foo.pdf
                # STORAGE_ROOT_PARENT = /app/storage
                # path_key = archives/SERV/2026/01/foo.pdf
                path_key = f.replace(STORAGE_ROOT_PARENT, "").lstrip('/')
                
                archives.append({
                    'filename': os.path.basename(f),
                    'path_key': path_key,
                    'type': 'SNAPSHOT' if is_snapshot else 'REPORT',
                    'size': stat.st_size,
                    'created': datetime.fromtimestamp(stat.st_mtime).isoformat()
                })
            except Exception as e:
                logger.warning(f"Skipping file {f}: {e}")
                continue
            
        return jsonify({'data': archives})
    except Exception as e:
        logger.error(f"ARCHIVE_LIST_ERROR: {e}")
        return jsonify({'data': []}), 200

@reports_v2_bp.route('/download', methods=['GET'])
# @token_required_v2 # Allow for now via query param token or strict header
def download_archive():
    """
    Serve file from storage.
    Query Param: ?key=archives/SERVICEABLE/2026/01/RPT.pdf
    """
    key = request.args.get('key')
    if not key:
        return jsonify({"error": "Missing key"}), 400
        
    # Security: Ensure key doesn't traverse up
    if ".." in key or key.startswith("/"):
        return jsonify({"error": "Invalid key"}), 403
        
    # Construct absolute path from /app/storage
    # We assume 'key' is relative to /app/storage (parent of archives)
    # as generated in list_archives (archives/...)
    
    # STORAGE_BASE_DIR is /app/storage/archives
    # STORAGE_ROOT is /app/storage
    STORAGE_ROOT = os.path.dirname(STORAGE_BASE_DIR)
    
    abs_path = os.path.join(STORAGE_ROOT, key)
    
    if not os.path.exists(abs_path):
        return jsonify({"error": "File not found"}), 404
        
    # CORRUPTION CHECK
    file_size = os.path.getsize(abs_path)
    if file_size < 2000:
        logger.warning(f"CORRUPTION DETECTED: File {abs_path} is only {file_size} bytes. Deleting.")
        try:
            os.remove(abs_path)
        except Exception as e:
            logger.error(f"FAILED TO DELETE CORRUPT FILE: {e}")
            
        return jsonify({
            "error": "Corrupted File", 
            "message": "The requested report was corrupted and has been removed. Please regenerate it."
        }), 500

    # Explicit MIME Type
    mime = 'application/octet-stream'
    if abs_path.lower().endswith('.pdf'):
        mime = 'application/pdf'
    elif abs_path.lower().endswith('.xlsx'):
        mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        
    logger.info(f"Serving File: {abs_path} ({file_size} bytes) | MIME: {mime}") 
    return send_file(abs_path, as_attachment=True, mimetype=mime)

@reports_v2_bp.route('/daily-snapshot', methods=['POST'])
# @token_required_v2
def trigger_daily_snapshot():
    """
    Manually Trigger Daily Snapshot (Admin/Cron).
    POST /api/reports/v2/daily-snapshot
    """
    try:
        from .services import generate_daily_snapshot_logic
        db = get_db()
        result = generate_daily_snapshot_logic(db, user_id="ADMIN_TRIGGER")
        return jsonify(result)
    except Exception as e:
        logger.error(f"Daily Snapshot Validation Error: {e}")
        return jsonify({'error': str(e)}), 500



