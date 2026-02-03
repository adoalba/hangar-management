import io, os, logging, itertools, json, base64
import pandas as pd
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, send_file
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# --- UNIFIED EMAIL SYSTEM ---
from .. import server_email

# --- PDF ENGINE IMPORTS ---
try:
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.pdfgen import canvas
    from reportlab.lib import colors
    from reportlab.lib.units import inch, mm
    from reportlab.lib.utils import ImageReader, simpleSplit
except ImportError:
    os.system("pip install reportlab pandas xlsxwriter openpyxl qrcode[pil] pillow")
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.pdfgen import canvas
    from reportlab.lib import colors
    from reportlab.lib.units import inch, mm
    from reportlab.lib.utils import ImageReader, simpleSplit

try:
    import qrcode
except ImportError:
    qrcode = None

logger = logging.getLogger(__name__)
reports_v2_bp = Blueprint('reports_v2', __name__, url_prefix='/api/reports')

# --- RATE LIMITING ---
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri="memory://",
    default_limits=["100 per hour"]
)

# --- STORAGE CONFIGURATION ---
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
STORAGE_DIR = os.path.join(BASE_DIR, 'storage')
ARCHIVE_DIR = os.path.join(STORAGE_DIR, 'archives')
SNAPSHOT_DIR = os.path.join(STORAGE_DIR, 'daily_snapshots')

# Ensure base directories exist
for d in [STORAGE_DIR, ARCHIVE_DIR, SNAPSHOT_DIR]:
    if not os.path.exists(d):
        os.makedirs(d, exist_ok=True)
        logger.info(f"Created storage directory: {d}")

# --- EMAIL TEMPLATES ---
def generate_email_body_html(report_type, report_id, total_items, attachment_name):
    """Generate HTML email body with professional styling (eco-friendly, minimal graphics)"""
    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 24px; color: #000;">World Class Aviation</h1>
        <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Inventory Management System</p>
    </div>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
        Your requested inventory report is attached to this email.
    </p>
    
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #ddd;">
        <tr style="background-color: #f4f4f4;">
            <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Report Type</td>
            <td style="padding: 12px; border: 1px solid #ddd;">{report_type}</td>
        </tr>
        <tr>
            <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Report ID</td>
            <td style="padding: 12px; border: 1px solid #ddd;">{report_id}</td>
        </tr>
        <tr style="background-color: #f4f4f4;">
            <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Generated</td>
            <td style="padding: 12px; border: 1px solid #ddd;">{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}</td>
        </tr>
        <tr>
            <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Total Items</td>
            <td style="padding: 12px; border: 1px solid #ddd;">{total_items}</td>
        </tr>
        <tr style="background-color: #f4f4f4;">
            <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Attachment</td>
            <td style="padding: 12px; border: 1px solid #ddd;"><strong>{attachment_name}</strong></td>
        </tr>
    </table>
    
    <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
        This is an automated message from the WCA Inventory Management System.<br>
        For questions or support, please contact your system administrator.
    </p>
    
    <div style="margin-top: 20px; padding: 15px; background-color: #f9f9f9; border-left: 3px solid #000; font-size: 12px; color: #666;">
        <strong>World Class Aviation</strong><br>
        1130 Dividend Ct, Peachtree City, Georgia 30269<br>
        Phone: (770) 631-1961<br>
        Email: ops@worldclassaviation.com
    </div>
</body>
</html>
"""

def generate_card_email_html(card_data):
    """Generate HTML email for individual inventory card"""
    pn = card_data.get('pn', 'N/A')
    sn = card_data.get('sn', 'N/A')
    desc = card_data.get('desc', 'N/A')
    loc = card_data.get('loc', 'N/A')
    cond = card_data.get('cond', 'N/A')
    
    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 24px; color: #000;">World Class Aviation</h1>
        <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Inventory Card</p>
    </div>
    
    <h2 style="margin-top: 0; color: #000;">Component Details</h2>
    
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #ddd;">
        <tr style="background-color: #f4f4f4;">
            <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold; width: 40%;">Part Number</td>
            <td style="padding: 12px; border: 1px solid #ddd;">{pn}</td>
        </tr>
        <tr>
            <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Serial Number</td>
            <td style="padding: 12px; border: 1px solid #ddd;">{sn}</td>
        </tr>
        <tr style="background-color: #f4f4f4;">
            <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Description</td>
            <td style="padding: 12px; border: 1px solid #ddd;">{desc}</td>
        </tr>
        <tr>
            <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Location</td>
            <td style="padding: 12px; border: 1px solid #ddd;">{loc}</td>
        </tr>
        <tr style="background-color: #f4f4f4;">
            <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Condition</td>
            <td style="padding: 12px; border: 1px solid #ddd;"><strong>{cond}</strong></td>
        </tr>
        <tr>
            <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Quantity</td>
            <td style="padding: 12px; border: 1px solid #ddd;">{card_data.get('qty', 'N/A')}</td>
        </tr>
        <tr style="background-color: #f4f4f4;">
            <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Manufacturer</td>
            <td style="padding: 12px; border: 1px solid #ddd;">{card_data.get('manuf', 'N/A')}</td>
        </tr>
        <tr>
            <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">TSN / CSN</td>
            <td style="padding: 12px; border: 1px solid #ddd;">{card_data.get('tsn', '-')} / {card_data.get('csn', '-')}</td>
        </tr>
        <tr style="background-color: #f4f4f4;">
            <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">TSO / CSO</td>
            <td style="padding: 12px; border: 1px solid #ddd;">{card_data.get('tso', '-')} / {card_data.get('cso', '-')}</td>
        </tr>
    </table>
    
    <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
        This is an automated message from the WCA Inventory Management System.<br>
        For questions or support, please contact your system administrator.
    </p>
    
    <div style="margin-top: 20px; padding: 15px; background-color: #f9f9f9; border-left: 3px solid #000; font-size: 12px; color: #666;">
        <strong>World Class Aviation</strong><br>
        1130 Dividend Ct, Peachtree City, Georgia 30269<br>
        Phone: (770) 631-1961<br>
        Email: ops@worldclassaviation.com
    </div>
</body>
</html>
"""

# --- ADVANCED PERSISTENCE ---
def save_backup(buffer, filename, report_type, raw_data=None):
    """
    Saves:
    1. The File (PDF/Excel) into archives/YYYY-MM/TYPE/
    2. The Raw Data (JSON) into daily_snapshots/YYYY-MM/TYPE/
    """
    try:
        # 1. Prepare Paths
        date_folder = datetime.now().strftime('%Y-%m')
        type_folder = report_type.upper().replace(' ', '_')
        
        # Paths for Archives (Visual) and Snapshots (Data)
        archive_path = os.path.join(ARCHIVE_DIR, date_folder, type_folder)
        snapshot_path = os.path.join(SNAPSHOT_DIR, date_folder, type_folder)

        for d in [archive_path, snapshot_path]:
            if not os.path.exists(d):
                os.makedirs(d, exist_ok=True)

        # 2. Save Visual File (PDF/Excel)
        file_path = os.path.join(archive_path, filename)
        buffer.seek(0)
        with open(file_path, 'wb') as f:
            f.write(buffer.read())
        buffer.seek(0)  # Reset buffer for HTTP response

        # 3. Save Data Snapshot (JSON) - Critical for backup
        if raw_data:
            json_filename = filename.rsplit('.', 1)[0] + '.json'
            json_path = os.path.join(snapshot_path, json_filename)
            
            # Add metadata to JSON
            snapshot_data = {
                'metadata': {
                    'report_type': report_type,
                    'generated_at': datetime.now(timezone.utc).isoformat(),
                    'total_items': len(raw_data) if isinstance(raw_data, list) else 0,
                    'filename': filename
                },
                'data': raw_data
            }
            
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(snapshot_data, f, indent=2, ensure_ascii=False)

        logger.info(f"✓ BACKUP SUCCESS: {file_path}")
        if raw_data:
            logger.info(f"✓ SNAPSHOT SAVED: {json_path}")
        
        return file_path

    except Exception as e:
        logger.error(f"✗ BACKUP FAILED: {e}")
        return None

# --- PDF HELPERS (ECO-PRINT DESIGN) ---
def draw_page_header(c, width, height, page_num, total_pages, meta):
    """Eco-Print Header - Black on White with Professional Titles"""
    # DYNAMIC TITLE LOGIC
    raw_type = meta.get('reportType', 'INVENTORY')
    
    # Map raw types to nice English titles
    title_map = {
        'INVENTORY': 'INVENTORY REPORT',
        'LOCATION': 'LOCATION AUDIT REPORT',
        'STATUS': 'CONDITION REPORT',
        'BY_PN': 'PART HISTORY REPORT',
        'PART_HISTORY': 'PART HISTORY REPORT'
    }
    
    report_title = f"WCA - {title_map.get(raw_type, raw_type + ' REPORT')}"
    
    c.setStrokeColor(colors.black)
    c.setLineWidth(1)
    c.line(30, height - 45, width - 30, height - 45)
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(30, height - 35, report_title)
    c.setFont("Helvetica", 9)
    timestamp = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')
    c.drawRightString(width - 30, height - 25, f"ID: {meta.get('reportId', '-')}")
    c.drawRightString(width - 30, height - 35, f"Generated: {timestamp}")
    
    # Footer
    c.line(30, 40, width - 30, 40)
    c.setFont("Helvetica-Oblique", 8)
    c.drawString(30, 25, "CERTIFIED TRUE COPY - GENERATED FROM COMPUTERIZED MAINTENANCE MANAGEMENT SYSTEM")
    c.setFont("Helvetica-Bold", 9)
    c.drawRightString(width - 30, 25, f"Page {page_num} of {total_pages}")

def draw_item_row(c, y, item, width):
    """Dense multi-line item row with standardized condition"""
    c.setStrokeColor(colors.black)
    c.setLineWidth(0.5)
    c.setFillColor(colors.black)
    
    # Line 1: P/N + Description
    c.setFont("Helvetica-Bold", 10)
    c.drawString(35, y, f"P/N: {item.get('pn','N/A')}")
    c.setFont("Helvetica", 10)
    c.drawRightString(width - 35, y, str(item.get('desc','N/A'))[:40])
    
    # Line 2: Location, S/N, STANDARDIZED Condition, QTY
    y -= 12
    c.setFont("Helvetica", 8)
    c.drawString(35, y, f"LOC: {item.get('loc','-')}")
    c.drawString(150, y, f"S/N: {item.get('sn','-')}")
    
    # IMPORTANT: Condition is STANDARDIZED from Frontend
    c.setFont("Helvetica-Bold", 8)
    cond = item.get('cond', 'N/A')
    c.drawString(260, y, f"COND: {cond}")
    
    c.setFont("Helvetica-Bold", 8)
    c.drawString(400, y, f"QTY: {item.get('qty','1')}")
    
    # Line 3: Times & Cycles (6 fields)
    y -= 10
    c.setFont("Helvetica-Oblique", 7)
    c.drawString(35, y, f"TSN:{item.get('tsn','-')} CSN:{item.get('csn','-')} TSO:{item.get('tso','-')} CSO:{item.get('cso','-')} TSR:{item.get('tsr','-')} CSR:{item.get('csr','-')}")
    
    # Line 4: Traceability
    y -= 10
    c.drawString(35, y, f"Manuf: {item.get('manuf','-')} | Lot: {item.get('lot','-')} | Trace: {item.get('trace','-')} | Tag: {item.get('tag_date','-')} | Exp: {item.get('exp','-')}")
    
    # Separator
    y -= 5
    c.setStrokeColor(colors.lightgrey)
    c.line(30, y, width - 30, y)
    
    return y - 15

# --- GENERATORS (LOCATION & STANDARD) ---
def generate_grouped_pdf(data, meta):
    """Location-grouped PDF with two-pass page counting"""
    # PASS 1: Estimate pages
    total_pages = max(1, len(data) // 12 + 1)
    
    # PASS 2: Generate
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    y = height - 70
    page_num = 1
    
    draw_page_header(c, width, height, page_num, total_pages, meta)
    
    # Sort by location
    sorted_data = sorted(data, key=lambda x: str(x.get('loc', 'UNASSIGNED')))
    
    for location, items_iter in itertools.groupby(sorted_data, key=lambda x: str(x.get('loc', 'UNASSIGNED'))):
        items = list(items_iter)
        
        if y < 100:
            c.showPage()
            page_num += 1
            draw_page_header(c, width, height, page_num, total_pages, meta)
            y = height - 70
        
        # Location Header (Eco-Print: White bg, Black border)
        c.setFillColor(colors.white)
        c.setStrokeColor(colors.black)
        c.setLineWidth(1)
        c.rect(30, y - 20, width - 60, 20, fill=1, stroke=1)
        
        c.setFillColor(colors.black)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(40, y - 14, f"LOC: {location}")
        c.drawRightString(width - 40, y - 14, f"ITEMS: {len(items)}")
        
        y -= 40
        
        for item in items:
            if y < 60:
                c.showPage()
                page_num += 1
                draw_page_header(c, width, height, page_num, total_pages, meta)
                y = height - 70
                c.setFont("Helvetica-Oblique", 9)
                c.setFillColor(colors.black)
                c.drawString(30, y, f"{location} (Continued...)")
                y -= 15
            
            y = draw_item_row(c, y, item, width)
        
        y -= 10
    
    # End Marker
    if y < 50:
        c.showPage()
        page_num += 1
        draw_page_header(c, width, height, page_num, total_pages, meta)
        y = height - 70
    
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(width/2, y-20, "*** END OF REPORT ***")
    c.setFont("Helvetica", 8)
    c.drawCentredString(width/2, y-32, f"Total Items: {len(data)}")
    
    c.save()
    buffer.seek(0)
    return buffer

def generate_standard_pdf(data, meta):
    """Standard PDF for inventory/PN reports"""
    total_pages = max(1, len(data) // 12 + 1)
    
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    y = height - 70
    page_num = 1
    
    draw_page_header(c, width, height, page_num, total_pages, meta)
    
    for item in data:
        if y < 60:
            c.showPage()
            page_num += 1
            draw_page_header(c, width, height, page_num, total_pages, meta)
            y = height - 70
        
        y = draw_item_row(c, y, item, width)
    
    # End Marker
    if y < 50:
        c.showPage()
        page_num += 1
        draw_page_header(c, width, height, page_num, total_pages, meta)
        y = height - 70
    
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(width/2, y-20, "*** END OF REPORT ***")
    c.setFont("Helvetica", 8)
    c.drawCentredString(width/2, y-32, f"Total Items: {len(data)}")
    
    c.save()
    buffer.seek(0)
    return buffer

# --- SINGLE CARD GENERATOR (Full-Page Component Card - MASTER VERSION) ---
def generate_single_card_pdf(item, meta):
    """
    OFFICIAL COMPONENT CARD GENERATOR (MASTER - SINGLE SOURCE OF TRUTH)
    Used for BOTH Print (/download) and Email (/send-email)
    Matches the "Golden Record" specification exactly.
    """
    # ============================================
    # DEBUG LOG TO VERIFY NEW CODE IS EXECUTING
    # ============================================
    pn_debug = item.get('pn') or item.get('part_number') or 'UNKNOWN'
    print(f"========================================")
    print(f"🔧 GENERATING OFFICIAL PDF FOR: {pn_debug}")
    print(f"========================================")
    logger.info(f"[PDF-GEN-MASTER] Generating card for P/N: {pn_debug}")
    
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    w, h = letter
    
    # ============================================
    # 1. ROBUST DATA FETCHING (Fixes "N/A" issues)
    # ============================================
    # Check multiple possible keys for each field to prevent "N/A" errors
    pn = item.get('pn') or item.get('part_number') or 'N/A'
    sn = item.get('sn') or item.get('serial_number') or 'N/A'
    desc = item.get('desc') or item.get('description') or item.get('partName') or 'N/A'
    
    # CRITICAL: Location with multiple fallbacks
    loc = (item.get('loc') or 
           item.get('location') or 
           item.get('final_location') or 
           item.get('physical_location') or 
           'UNASSIGNED')
    
    cond = item.get('cond') or item.get('condition') or item.get('status') or 'N/A'
    reg_date = (item.get('tag_date') or 
                item.get('reg_date') or 
                item.get('date') or 
                item.get('registrationDate') or 
                datetime.now().strftime("%m/%d/%Y"))
    exp_date = (item.get('exp') or 
                item.get('expiration_date') or 
                item.get('shelf_life') or 
                item.get('shelfLife') or 
                'N/A')
    remarks = item.get('remarks') or 'None'
    
    # Debug log the extracted data
    logger.info(f"[PDF-GEN-MASTER] Location resolved to: {loc}")
    logger.info(f"[PDF-GEN-MASTER] Condition: {cond}, Exp: {exp_date}")
    
    # ============================================
    # 2. DRAWING LOGIC (The "Golden Record" Layout)
    # ============================================
    
    # Main Border (Color Coded by Condition) + Dynamic Header Title
    # Handles all 4 types: Serviceable, Repairable, Unserviceable, Rotable
    border_color = colors.yellow
    header_title = "SERVICEABLE MATERIAL" 
    sub_header_title = "MATERIAL APROBADO" # Default
    location_label = "FINAL LOCATION / POSICIÓN FINAL" # Default
    cert_text = "WORLD CLASS AVIATION CERTIFIES that this component/material meets the requirements of applicable manuals and current reference documents. Approved for use as SERVICEABLE MATERIAL. / CERTIFICA que este componente / material cumple con los requisitos de los manuales aplicables y documentos de referencia vigentes. Aprueba este componente como MATERIAL APROBADO para uso."

    if 'REPAIR' in cond.upper() or 'GREEN' in cond.upper():
        border_color = colors.green
        header_title = "REPAIRABLE MATERIAL"
        sub_header_title = "MATERIAL REPARABLE"
        location_label = "STORAGE LOC / LUGAR DE ALMACÉN"
        cert_text = "WORLD CLASS AVIATION CERTIFIES that this component/material meets internal manuals and reference document requirements. / CERTIFICA que este componente / material cumple con los requisitos de manuales internos y documentos de referencia."
    elif 'UNSERV' in cond.upper() or 'RED' in cond.upper() or 'REJECT' in cond.upper():
        border_color = colors.red
        header_title = "UNSERVICEABLE MATERIAL" # Matches REJECTED MATERIAL in frontend concept
        sub_header_title = "MATERIAL RECHAZADO"
        location_label = "QUARANTINE / ZONA CUARENTENA"
        cert_text = "DOES NOT MEET APPLICABLE REQUIREMENTS. REJECTED FOR USE. / NO CUMPLE REQUISITOS APLICABLES. RECHAZADO PARA USO."
    elif 'ROTABLE' in cond.upper() or 'BLUE' in cond.upper() or 'REMOVED' in cond.upper():
        border_color = colors.blue
        header_title = "ROTABLE MATERIAL"
        sub_header_title = "MATERIAL REMOVIDO" # REMOVED NO DEFECT
        location_label = "STORAGE LOC / LUGAR DE ALMACÉN" # Matches White tag logic roughly
        cert_text = "REMOVED FOR DESCRIBED REASON AND MEETS CURRENT REQUIREMENTS. / REMOVIDO POR LA RAZÓN DESCRITA Y CUMPLE CON REQUISITOS VIGENTES."
    
    logger.info(f"[PDF-GEN-MASTER] Border Color: {border_color}, Header: {header_title}")
    
    c.setStrokeColor(border_color)
    c.setLineWidth(12)
    c.rect(15, 15, w-30, h-30)
    
    # HEADER
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(45, h-70, "INVENTORY")
    c.drawString(45, h-92, "PART")
    c.setFont("Helvetica-Bold", 7)
    c.drawString(45, h-105, "AVIATION TECHNICAL RECORD")
    
    # QR Code Placeholder (Center)
    # QR Code Generation (REAL)
    qr_val = item.get('id') or item.get('pn', 'UNKNOWN')
    qr_url = f"https://inventory.worldclassaviation.com/track/{qr_val}"
    
    qr_drawn = False
    if qrcode:
        try:
            qr = qrcode.make(qr_url)
            qr_img = ImageReader(qr.get_image())
            c.drawImage(qr_img, 260, h-100, 50, 50)
            qr_drawn = True
        except Exception as e:
            logger.error(f"QR Code Generation Error: {e}")
            
    if not qr_drawn:
        # Fallback Box
        c.setStrokeColor(colors.black)
        c.setLineWidth(1)
        c.rect(260, h-100, 50, 50, fill=0, stroke=1)
        
    c.setFillColor(colors.black)
    c.setFont("Helvetica", 6)
    c.drawCentredString(285, h-108, "SCAN TO TRACK")
    
    # Condition Banner (Right) - WHITE/CLEAN STYLE with DYNAMIC TEXT
    c.setStrokeColor(colors.black)
    c.setLineWidth(1.5)
    c.setFillColor(colors.white)
    c.rect(340, h-95, 240, 40, fill=1, stroke=1)
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(460, h-75, header_title)  # DYNAMIC
    c.setFont("Helvetica", 8)
    c.drawCentredString(460, h-88, sub_header_title) # DYNAMIC SUBTITLE

    # ============================================
    # SECTION 01: ADMINISTRATIVE RECORD
    # ============================================
    y = h - 140
    c.setFillColor(colors.black)
    c.rect(40, y, w-80, 14, fill=1)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 7)
    c.drawString(45, y+4, "01. ADMINISTRATIVE RECORD / DATOS DE REGISTRO")
    
    y -= 18
    # Row 1: Organization + Reg Date
    c.setFillColor(colors.black)
    c.setLineWidth(1)
    c.rect(40, y-12, w-80, 24)  # Container
    c.line(140, y-12, 140, y+12)  # Vert divider 1
    c.line(400, y-12, 400, y+12)  # Vert divider 2
    c.line(460, y-12, 460, y+12)  # Vert divider 3
    
    c.setFont("Helvetica-Bold", 6)
    c.drawString(42, y+2, "ORGANIZATION / ORG")
    c.setFont("Helvetica-Bold", 9)
    c.drawString(145, y+2, "WORLD CLASS AVIATION")
    c.setFont("Helvetica-Bold", 6)
    c.drawString(405, y+2, "REG. DATE")
    c.setFont("Helvetica", 9)
    c.drawString(465, y+2, str(reg_date))

    # Row 2: Phone + Email
    y -= 24
    c.rect(40, y-12, w-80, 24)
    c.line(140, y-12, 140, y+12)  # Vert 1
    c.line(300, y-12, 300, y+12)  # Vert 2
    c.line(360, y-12, 360, y+12)  # Vert 3

    c.setFont("Helvetica-Bold", 6)
    c.drawString(42, y+2, "PHONE / TEL")
    c.setFont("Helvetica-Bold", 9)
    c.drawString(145, y+2, "(770) 631-1961")
    c.setFont("Helvetica-Bold", 6)
    c.drawString(305, y+2, "EMAIL")
    c.setFont("Helvetica-Bold", 8)
    c.drawString(365, y+2, "OPS@WORLDCLASSAVIATION.COM")

    # ============================================
    # SECTION 02: TECHNICAL IDENTIFICATION
    # ============================================
    y -= 30
    c.setFillColor(colors.black)
    c.rect(40, y, w-80, 14, fill=1)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 7)
    c.drawString(45, y+4, "02. TECHNICAL IDENTIFICATION / IDENTIFICACIÓN TÉCNICA")
    
    # Left Block (Data Fields)
    y -= 20
    row_h = 25
    c.setFillColor(colors.black)
    
    fields = [
        ("PART NAME", desc),
        ("P/N", pn),
        ("S/N", sn),
        ("BRAND", item.get('manuf') or item.get('manufacturer') or 'GENERIC'),
        ("MODEL", item.get('model') or 'TT1')
    ]
    
    for label, val in fields:
        c.rect(40, y-row_h, 300, row_h)  # Outer box
        c.line(120, y-row_h, 120, y)  # Splitter
        c.setFont("Helvetica-Bold", 6)
        c.drawString(42, y-15, label)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(125, y-15, str(val)[:25])
        y -= row_h
    
    # Photo Box (Right Side)
    photo_top = y + (row_h * 5)
    c.rect(350, y, w-390, (row_h * 5))
    c.setFont("Helvetica", 7)
    c.drawCentredString(465, y + 60, "NO PHOTO AVAILABLE")

    # ============================================
    # FINAL LOCATION STRIP (CRITICAL FIX)
    # ============================================
    y -= 30
    c.setFillColor(colors.black)
    c.rect(40, y, 120, 30, fill=1)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(45, y+10, location_label) # DYNAMIC LOCATION LABEL
    
    c.setFillColor(colors.black)
    c.rect(160, y, w-200, 30, fill=0)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(180, y+8, str(loc).upper())  # FORCE LOCATION DISPLAY

    # ============================================
    # SECTION 03: TIMES AND CYCLES
    # ============================================
    y -= 40
    c.setFillColor(colors.black)
    c.rect(40, y, w-80, 14, fill=1)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 7)
    c.drawString(45, y+4, "03. TIMES AND CYCLES / TIEMPOS Y CICLOS")
    
    y -= 30
    # Header Grid
    c.setLineWidth(1)
    c.rect(40, y, w-80, 20)
    col_w = (w-80)/6
    headers = ["TAT/T.T", "TSO", "T.REM", "TOTAL/TC", "CSO", "C.REM"]
    for i, h_text in enumerate(headers):
        c.line(40 + (i*col_w), y, 40 + (i*col_w), y+20)
        c.setFont("Helvetica-Bold", 6)
        c.drawCentredString(40 + (i*col_w) + (col_w/2), y+7, h_text)
    c.line(w-40, y, w-40, y+20)  # End line
    
    # Value Grid
    y -= 25
    c.rect(40, y, w-80, 25)
    # Value Grid - ROBUST CLEANING
    def _clean_val(v):
        """Prevents blank cells by forcing '-' on empty values"""
        if v is None: return '-'
        s = str(v).strip()
        if s == "" or s.lower() in ['none', 'null', 'undefined', 'n/a']: return '-'
        return s

    vals = [
        _clean_val(item.get('tsn')),
        _clean_val(item.get('tso')),
        _clean_val(item.get('trem')),
        _clean_val(item.get('csn')),
        _clean_val(item.get('cso')),
        _clean_val(item.get('crem'))
    ]
    for i, val in enumerate(vals):
        c.line(40 + (i*col_w), y, 40 + (i*col_w), y+25)
        c.setFont("Helvetica-Bold", 11)
        c.drawCentredString(40 + (i*col_w) + (col_w/2), y+8, str(val))
    c.line(w-40, y, w-40, y+25)

    # ============================================
    # SECTION 04: CONDITION & REMOVAL
    # ============================================
    y -= 30
    c.setFillColor(colors.black)
    c.rect(40, y, w-80, 14, fill=1)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 7)
    c.drawString(45, y+4, "04. CONDITION & REMOVAL / CONDICIÓN Y REMOCIÓN")
    
    y -= 25
    c.setFillColor(colors.black)
    c.rect(40, y, w-80, 25)
    
    # Logic for Section 04 content based on template
    if border_color == colors.yellow:
        c.line(180, y, 180, y+25)
        c.setFont("Helvetica-Bold", 6)
        c.drawString(42, y+10, "SHELF LIFE / FECHA VENC.")
        c.setFont("Helvetica-Bold", 11)
        c.setFillColor(colors.red)
        c.drawString(190, y+8, str(exp_date))
    elif border_color == colors.red:
        c.line(180, y, 180, y+25)
        c.setFont("Helvetica-Bold", 6)
        c.drawString(42, y+10, "REJECTION / MOTIVO")
        c.setFont("Helvetica-Bold", 11)
        c.setFillColor(colors.red)
        # Assuming rejection reason is stored in exp_date or needs 'rejectionReason' key
        # Using generic fallback for now
        c.drawString(190, y+8, str(item.get('rejectionReason') or item.get('reason') or 'N/A'))
    else:
        # Green/Blue/White style checkboxes logic
        # Simplified for PDF: Just list the reason text if available or draw generic boxes
        c.line(100, y, 100, y+25)
        c.setFont("Helvetica-Bold", 6)
        c.setFillColor(colors.black)
        c.drawString(45, y+10, "REASON:")
        
        # Draw Reason Text
        reason = item.get('removalReason') or item.get('reason') or 'Unknown'
        c.setFont("Helvetica-Bold", 10)
        c.drawString(110, y+8, str(reason).upper())

    # ============================================
    # SECTION 05: TECH REPORTS & REMARKS
    # (THE MISSING SECTION - CRITICAL)
    # ============================================
    y -= 30
    c.setFillColor(colors.black)
    c.rect(40, y, w-80, 14, fill=1)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 7)
    c.drawString(45, y+4, "05. TECH REPORTS & REMARKS / REPORTES Y OBSERVACIONES")
    
    # Section 05 Logic: Add Tech Report if Green/Repairable
    is_repairable = border_color == colors.green
    section_height = 50 if is_repairable else 35
    
    y -= section_height
    c.setFillColor(colors.black)
    c.rect(40, y, w-80, section_height)
    
    current_y = y + section_height - 10
    
    if is_repairable:
        c.setFont("Helvetica", 6)
        c.setFillColor(colors.gray)
        c.drawString(42, current_y, "TECH REPORT / REPORTE TÉCNICO:")
        c.setFont("Helvetica", 9)
        c.setFillColor(colors.black)
        c.drawString(45, current_y - 12, str(item.get('technicalReport') or 'N/A')[:90])
        
        # Divider
        c.setStrokeColor(colors.gray)
        c.line(40, current_y - 20, w-40, current_y - 20)
        current_y -= 30
    else:
        current_y -= 5

    c.setFont("Helvetica", 6)
    c.setFillColor(colors.gray)
    c.drawString(42, current_y, "REMARKS / OBSERVACIONES:")
    c.setFont("Helvetica", 9)
    c.setFillColor(colors.black)
    c.drawString(45, current_y - 12, str(remarks))

    # ============================================
    # FOOTER: SIGNATURES & LICENSE PILLS
    # ============================================
    y -= 70
    c.setLineWidth(1)
    c.setStrokeColor(colors.black)
    c.rect(40, y, 260, 60)  # Box 1
    c.rect(300, y, 270, 60)  # Box 2
    
    c.setFont("Helvetica-Bold", 7)
    c.setFillColor(colors.black)
    c.drawCentredString(170, y+52, "TECHNICAL CERTIFICATION / CERTIFICACIÓN TÉCNICA")
    c.setFont("Helvetica-Bold", 8)
    c.drawString(45, y+40, "NAME: AA")
    c.drawString(305, y+40, "NAME: GG")
    
    # DIGITAL SIGNATURE STAMPS
    c.saveState()
    c.translate(45, y+5)
    c.rotate(15)
    c.setStrokeColor(colors.blue)
    c.setFillColor(colors.white) # Transparent-ish
    c.rect(0, 0, 100, 30, fill=0)
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(colors.blue)
    c.drawCentredString(50, 10, "DIGITALLY SIGNED")
    c.setFont("Helvetica", 6)
    c.drawCentredString(50, 2, f"ID: {item.get('id', 'Unknown')[-6:]}")
    c.restoreState()
    
    c.saveState()
    c.translate(305, y+5)
    c.rotate(15)
    c.setStrokeColor(colors.green)
    c.rect(0, 0, 100, 30, fill=0)
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(colors.green)
    c.drawCentredString(50, 10, "DIGITALLY SIGNED")
    c.restoreState()

    # LICENSE PILLS (Blue/Green Backgrounds)
    c.setFillColor(colors.lavender)
    c.rect(50, y+15, 100, 15, fill=1, stroke=0)
    c.setFillColor(colors.lightgreen)
    c.rect(310, y+15, 100, 15, fill=1, stroke=0)
    
    c.setFillColor(colors.blue)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(80, y+19, "LIC: GBF43")
    c.setFillColor(colors.darkgreen)
    c.drawString(340, y+19, "LIC: 55")

    c.setFont("Helvetica", 5)
    # footer_text is now dynamic based on condition (set at top)
    # Split text if too long
    c.drawCentredString(w/2, 35, cert_text[:130]) # Top line
    if len(cert_text) > 130:
        c.drawCentredString(w/2, 29, cert_text[130:]) # Bottom line
    
    # ============================================
    # DEBUG MARKER - PROVES NEW GENERATOR IS RUNNING
    # ============================================
    c.setFillColor(colors.red)
    c.setFont("Helvetica-Bold", 7)
    c.drawCentredString(w/2, 20, "★ UNIFIED MASTER GENERATOR V2.0 ★")
    c.setFont("Helvetica", 5)
    c.drawCentredString(w/2, 12, f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    c.save()
    buffer.seek(0)
    
    print(f"✅ PDF GENERATION COMPLETE FOR: {pn}")
    logger.info(f"[PDF-GEN-MASTER] PDF generation complete for P/N: {pn}")
    
    return buffer

# --- TRACEABILITY REPORT GENERATOR (TIMELINE STYLE) ---
def generate_traceability_pdf(item, meta):
    """
    Generates a visual Traceability Timeline that mirrors TraceabilityModal.tsx
    """
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    margin_x = 40
    content_width = width - (margin_x * 2)
    
    # 1. SETUP COLORS
    def get_tag_color_hex(tag):
        if tag == 'YELLOW': return '#eab308'
        if tag == 'GREEN': return '#10b981'
        if tag == 'RED': return '#f43f5e'
        if tag == 'WHITE': return '#cbd5e1'
        return '#6366f1' # Default Indigo
    
    tag_hex = get_tag_color_hex(item.get('tagColor', 'YELLOW'))
    
    # 2. HEADER DRAWING FUNCTION
    def draw_header(c, current_y):
        # Main Border (10px solid color)
        c.setLineWidth(10)
        c.setStrokeColor(colors.HexColor(tag_hex))
        c.rect(0, 0, width, height, fill=0, stroke=1)
        
        # Header Container
        h_y = current_y
        c.setLineWidth(1)
        c.setStrokeColor(colors.black)
        
        # Bottom border of header
        c.line(margin_x, h_y - 85, width - margin_x, h_y - 85)
        
        # Title Column (Left)
        c.setFillColor(colors.black)
        c.setFont("Helvetica-Bold", 18)
        c.drawString(margin_x, h_y - 30, "TRACEABILITY RECORD")
        c.setFont("Helvetica-Bold", 14)
        c.drawString(margin_x, h_y - 50, "HISTORIAL DE TRAZABILIDAD")
        c.setFont("Helvetica-Bold", 8)
        c.setFillColor(colors.HexColor('#64748b')) # Slate 500
        c.drawString(margin_x, h_y - 65, f"AVIATION TECHNICAL RECORD • {item.get('partName', 'COMPONENT').upper()}")
        
        # Info Column (Right)
        # Random REC-ID simulation (or use real ID if available)
        rec_id = f"REC-{str(item.get('id', '000'))[-6:].upper()}"
        
        # ID Box
        c.setFillColor(colors.whitesmoke)
        c.rect(width - margin_x - 120, h_y - 35, 120, 15, fill=1, stroke=0)
        c.setFillColor(colors.black)
        c.setFont("Courier-Bold", 9)
        c.drawRightString(width - margin_x - 5, h_y - 31, rec_id)
        
        # PN / SN
        c.setFont("Helvetica-Bold", 9)
        c.drawRightString(width - margin_x, h_y - 55, "P/N:")
        c.setFont("Helvetica-Bold", 14)
        c.drawRightString(width - margin_x, h_y - 70, str(item.get('pn', 'N/A')))
        
        if item.get('sn'):
            c.setFont("Helvetica-Bold", 9)
            c.drawRightString(width - margin_x - 100, h_y - 55, "S/N:")
            c.setFont("Helvetica-Bold", 14)
            c.drawRightString(width - margin_x - 100, h_y - 70, str(item.get('sn', 'N/A')))
            
        return h_y - 100 # New Y position
        
    # 3. CONTENT RENDER LOOP
    y = height - 40
    y = draw_header(c, y)
    
    # Audit Summary (Mini Dashboard)
    history = item.get('history', [])
    # Sort history descending
    history = sorted(history, key=lambda x: x.get('timestamp', ''), reverse=True)
    
    if history:
        # Summary Box
        c.setLineWidth(1)
        c.setStrokeColor(colors.black)
        c.rect(margin_x, y - 60, content_width, 60, fill=0, stroke=1)
        
        c.setFont("Helvetica-Bold", 8)
        c.setFillColor(colors.HexColor('#64748b'))
        c.drawString(margin_x + 10, y - 15, "AUDIT SUMMARY / RESUMEN DE AUDITORÍA")
        
        # Stats Grid (Simplified for PDF)
        c.setFillColor(colors.black)
        c.setFont("Helvetica-Bold", 16)
        
        # Total Events
        c.drawString(margin_x + 40, y - 40, str(len(history)))
        c.setFont("Helvetica", 6)
        c.drawString(margin_x + 40, y - 50, "EVENTS")
        
        # Moves
        moves = len([e for e in history if e.get('type') == 'LOCATION_CHANGE'])
        c.setFont("Helvetica-Bold", 16)
        c.drawString(margin_x + 140, y - 40, str(moves))
        c.setFont("Helvetica", 6)
        c.drawString(margin_x + 140, y - 50, "MOVES")
        
        # Locations
        locs = len(set([e.get('newLocation') for e in history if e.get('newLocation')]))
        c.setFont("Helvetica-Bold", 16)
        c.drawString(margin_x + 240, y - 40, str(locs))
        c.setFont("Helvetica", 6)
        c.drawString(margin_x + 240, y - 50, "LOCATIONS")
        
        y -= 80 # Space after summary
    
    # Timeline
    timeline_x = margin_x + 20
    c.setLineWidth(2)
    c.setStrokeColor(colors.black) # Timeline line color
    # Note: We don't draw the full vertical line yet, we'll draw segments or just points
    
    for event in history:
        # Check page break
        if y < 150: # Trigger break
            c.showPage()
            y = height - 40
            y = draw_header(c, y)
            y -= 20 # Padding
        
        # Event Colors
        etype = event.get('type', 'UNKNOWN')
        badge_bg = '#f1f5f9' # Slate 100
        badge_text = '#475569'
        dot_color = '#64748b'
        
        if etype == 'CREATION': 
            badge_bg, badge_text, dot_color = '#ecfdf5', '#059669', '#10b981' # Emerald
        elif etype == 'LOCATION_CHANGE':
            badge_bg, badge_text, dot_color = '#eef2ff', '#4f46e5', '#6366f1' # Indigo
        elif etype == 'STATUS_CHANGE':
            badge_bg, badge_text, dot_color = '#fffbeb', '#d97706', '#f59e0b' # Amber
            
        # Draw Timeline Dot
        c.setFillColor(colors.black)
        c.setStrokeColor(colors.white)
        c.setLineWidth(2)
        c.circle(timeline_x, y - 15, 4, fill=1, stroke=1)
        
        # Draw Card Box
        box_x = timeline_x + 20
        box_w = content_width - 40
        
        # Calculate dynamic height based on Description
        desc = event.get('description', '')
        c.setFont("Helvetica-Bold", 10)
        wrapped_desc = simpleSplit(desc, "Helvetica-Bold", 10, box_w - 20)
        desc_h = len(wrapped_desc) * 12
        
        box_h = 35 + desc_h + 35 # Header + Desc + Footer
        
        # Box Rect
        c.setStrokeColor(colors.black)
        c.setLineWidth(1)
        c.setFillColor(colors.white)
        c.rect(box_x, y - box_h, box_w, box_h, fill=1, stroke=1)
        
        cur_box_y = y
        
        # Badge & Date
        c.setFillColor(colors.HexColor(badge_bg))
        c.setStrokeColor(colors.black)
        p_width = c.stringWidth(etype.replace('_', ' '), "Helvetica-Bold", 8) + 10
        c.rect(box_x + 10, cur_box_y - 25, p_width, 15, fill=1, stroke=1)
        
        c.setFillColor(colors.black) # map to badge_text if possible, but black is safe for print
        c.setFont("Helvetica-Bold", 8)
        c.drawString(box_x + 15, cur_box_y - 21, etype.replace('_', ' '))
        
        # Date
        ts_str = event.get('timestamp', '')
        try:
            # Parse ISO format if possible
            dt = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
            date_str = dt.strftime("%Y-%m-%d %H:%M:%S")
        except:
            date_str = ts_str
            
        c.setFont("Courier-Bold", 9)
        c.drawRightString(box_x + box_w - 10, cur_box_y - 21, date_str)
        
        # Description
        cur_box_y -= 40
        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(colors.HexColor('#1e293b'))
        for line in wrapped_desc:
            c.drawString(box_x + 10, cur_box_y, line)
            cur_box_y -= 12
            
        # Footer (From / To / User) - Gray Box
        footer_y = y - box_h + 5
        footer_h = 25
        # Draw background for footer? Frontend uses border.
        c.setStrokeColor(colors.black)
        c.setLineWidth(0.5)
        c.line(box_x, footer_y + footer_h, box_x + box_w, footer_y + footer_h)
        
        # From
        if event.get('previousLocation'):
            c.setFont("Helvetica-Bold", 6)
            c.setFillColor(colors.HexColor('#64748b'))
            c.drawString(box_x + 10, footer_y + 15, "FROM / DESDE")
            c.setFont("Helvetica-Bold", 8)
            c.setFillColor(colors.black)
            c.drawString(box_x + 10, footer_y + 5, str(event.get('previousLocation')))
            
        # To
        c.setFont("Helvetica-Bold", 6)
        c.setFillColor(colors.HexColor('#64748b'))
        c.drawString(box_x + 150, footer_y + 15, "TO / HACIA")
        c.setFont("Helvetica-Bold", 8)
        c.setFillColor(colors.black)
        c.drawString(box_x + 150, footer_y + 5, str(event.get('newLocation', 'N/A')))
        
        # User
        c.setFont("Helvetica-Bold", 6)
        c.setFillColor(colors.HexColor('#64748b'))
        c.drawRightString(box_x + box_w - 10, footer_y + 15, "USER / USUARIO")
        c.setFont("Helvetica-Bold", 8)
        c.setFillColor(colors.black)
        c.drawRightString(box_x + box_w - 10, footer_y + 5, str(event.get('userName', 'System')))
        
        # Advance Y
        y -= (box_h + 10) # content + margin
        
    c.save()
    buffer.seek(0)
    return buffer

# --- ROUTER LOGIC: PDF Type Selector ---
def get_pdf_buffer(data, meta):
    """
    Intelligent PDF generator selector based on reportType
    Returns the appropriate PDF buffer for download or email
    """
    r_type = meta.get('reportType', 'INVENTORY')
    
    # 1. TRACEABILITY MODE - Formal certificate
    if r_type == 'TRACEABILITY':
        if data and len(data) > 0:
            return generate_traceability_pdf(data[0], meta)
        else:
            # Fallback if no data
            logger.warning("TRACEABILITY requested but no data provided")
            return generate_standard_pdf(data, meta)
    
    # 2. SINGLE CARD MODE - Full-page component card
    if r_type == 'CARD' and len(data) == 1:
        return generate_single_card_pdf(data[0], meta)
    
    # 3. LOCATION GROUPED REPORTS
    if r_type in ['LOCATION', 'BY_LOCATION']:
        return generate_grouped_pdf(data, meta)
    
    # 4. DEFAULT: Standard list report
    # 4. DEFAULT: Standard list report
    return generate_standard_pdf(data, meta)

def generate_official_card_internal(data, meta):
    """
    SHARED INTERNAL FUNCTION FOR PARITY.
    Extracted from /download to ensure /send-email uses the EXACT same logic.
    """
    # Simply calls the intelligent buffer selector, which routes to generate_single_card_pdf
    # This guarantees that whatever /download gets, /send-email also gets.
    return get_pdf_buffer(data, meta)

# --- ENDPOINTS ---


@reports_v2_bp.route('/download', methods=['POST'])
def download():
    """Generate and download PDF or Excel report with automatic backup"""
    try:
        req = request.get_json(force=True)
        data = req.get('reportData', {}).get('data', [])
        fmt = req.get('format', 'PDF')
        meta = req.get('reportData', {})
        r_type = meta.get('reportType', 'INVENTORY')
        
        # Dynamic filename with timestamp
        r_type_slug = r_type.replace('_', '-').lower()
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"WCA_{r_type_slug}_{timestamp}"
        
        if fmt == 'EXCEL':
            df = pd.DataFrame(data)
            cols = ['loc','pn','desc','qty','cond','sn','manuf','lot','exp','trace','tag_date','tsn','csn','tso','cso','tsr','csr','uom']
            df = df[[c for c in cols if c in df.columns] + [c for c in df.columns if c not in cols]]
            
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
                df.to_excel(writer, index=False, sheet_name='Report')
                worksheet = writer.sheets['Report']
                worksheet.autofilter(0, 0, len(df), len(df.columns)-1)
                for i, col in enumerate(df.columns):
                    column_len = max(df[col].astype(str).map(len).max(), len(col)) + 2
                    worksheet.set_column(i, i, column_len)
            
            # --- SAVE BACKUP (Excel + JSON Snapshot) ---
            save_backup(output, f"{filename}.xlsx", r_type, data)
            
            output.seek(0)
            return send_file(output, download_name=f"{filename}.xlsx", as_attachment=True, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        
        # PDF Generation Logic - USE INTELLIGENT SELECTOR
        # PDF Generation Logic - USE INTELLIGENT SELECTOR
        # REFAC: Use shared internal function for parity
        pdf_buffer = generate_official_card_internal(data, meta)
        
        # --- SAVE BACKUP (PDF + JSON Snapshot) ---
        save_backup(pdf_buffer, f"{filename}.pdf", r_type, data)
            
        return send_file(pdf_buffer, download_name=f"{filename}.pdf", as_attachment=True, mimetype='application/pdf')
        
    except Exception as e:
        logger.error(f"Report generation error: {e}")
        return jsonify({"error": str(e)}), 500

@reports_v2_bp.route('/send-email', methods=['POST'])
@reports_v2_bp.route('/send-card-unified', methods=['POST'])
@limiter.limit("10 per hour")  # Rate limiting: Max 10 emails per hour
def send_email():
    """Send report via email using UNIFIED email system"""
    try:
        req = request.get_json(force=True)
        recipient = req.get('recipient')
        cc = req.get('cc', [])  # Optional CC recipients
        bcc = req.get('bcc', [])  # Optional BCC recipients
        data = req.get('reportData', {}).get('data', [])
        
        # DEBUG LOG: Verify data arrived correctly
        if data and len(data) > 0:
            item_data = data[0]
            print(f"EMAIL REQUEST FOR: {item_data.get('pn')} | LOC: {item_data.get('loc')}")
            
        meta = req.get('reportData', {})
        r_type = meta.get('reportType', 'INVENTORY')
        report_id = meta.get('reportId', 'N/A')
        
        if not recipient:
            return jsonify({"error": "Recipient email is required"}), 400
        
        # 1. Generate PDF in Memory - USE INTELLIGENT SELECTOR
        # REFAC: Use shared internal function for parity
        pdf_buffer = generate_official_card_internal(data, meta)
        
        # 2. Create filename
        r_type_slug = r_type.replace('_', '-').lower()
        fname = f"WCA_{r_type_slug}_{datetime.now().strftime('%Y%m%d')}.pdf"
        
        # 3. Generate HTML Body
        html_body = generate_email_body_html(r_type, report_id, len(data), fname)
        
        # 4. Load SMTP config from unified system
        cfg = server_email.load_config()
        logs = []
        
        # 5. Prepare PDF as file attachment
        pdf_bytes = pdf_buffer.read()
        files = [{
            'filename': fname,
            'content': pdf_bytes,
            'mimetype': 'application/pdf'
        }]
        
        # 6. Prepare subject with CC/BCC info
        subject = f"WCA Inventory Report: {report_id}"
        
        # 7. Send email using UNIFIED SYSTEM
        # Note: server_email.send_via_smtp doesn't support CC/BCC yet, 
        # so we send to primary recipient for now
        success, message = server_email.send_via_smtp(
            cfg, 
            recipient, 
            subject, 
            html_body, 
            diagnostic_logs=logs, 
            files=files
        )
        
        if success:
            logger.info(f"Report email sent to {recipient}")
            return jsonify({"message": message, "logs": logs}), 200
        else:
            logger.error(f"Failed to send report email: {message}")
            return jsonify({"error": message, "logs": logs}), 500

    except Exception as e:
        logger.error(f"Email Error: {e}")
        return jsonify({"error": f"Failed to send: {str(e)}"}), 500

@reports_v2_bp.route('/send-card', methods=['POST'])
@limiter.limit("20 per hour")  # Higher limit for individual cards
def send_card_email():
    """Send individual inventory card via email using UNIFIED system"""
    try:
        req = request.get_json(force=True)
        recipient = req.get('recipient')
        card_data = req.get('cardData', {})
        
        if not recipient:
            return jsonify({"error": "Recipient email is required"}), 400
        
        if not card_data.get('pn') or not card_data.get('sn'):
            return jsonify({"error": "Card data must include P/N and S/N"}), 400
        
        pn = card_data.get('pn', 'UNKNOWN')
        sn = card_data.get('sn', 'NO-SN')
        
        # Detect Report Type (Default to CARD, but allow TRACEABILITY override)
        target_type = req.get('reportType', 'CARD')
        
        # 1. Generate PDF (Essential for Parity with Print)
        meta = {
            'reportType': target_type,
            'reportId': f"EMAIL-{datetime.now().strftime('%H%M%S')}"
        }
        # Generate using intelligent router
        pdf_buffer = get_pdf_buffer([card_data], meta)
        
        # 2. Generate HTML Body
        html_body = generate_card_email_html(card_data)
        
        # 3. Prepare PDF Attachment
        r_slug = target_type.lower()
        fname = f"WCA_{r_slug}_{pn}.pdf"
        
        files = [{
            'filename': fname,
            'content': pdf_buffer.read(),
            'mimetype': 'application/pdf'
        }]
        
        # 4. Load SMTP config
        cfg = server_email.load_config()
        logs = []
        
        # 5. Send email using UNIFIED SYSTEM with Attachment
        subject = f"WCA {target_type.title()}: {pn} / {sn}"
        success, message = server_email.send_via_smtp(
            cfg,
            recipient,
            subject,
            html_body,
            diagnostic_logs=logs,
            files=files
        )
        
        if success:
            logger.info(f"Card email sent to {recipient}")
            return jsonify({"message": message, "logs": logs}), 200
        else:
            logger.error(f"Failed to send card email: {message}")
            return jsonify({"error": message, "logs": logs}), 500

    except Exception as e:
        logger.error(f"Email Error: {e}")
        return jsonify({"error": f"Failed to send: {str(e)}"}), 500

@reports_v2_bp.route('/upload-email', methods=['POST'])
@limiter.limit("20 per hour")
def upload_email_report():
    """Receives a PDF Blob from Frontend and emails it (for visual parity)"""
    try:
        recipient = request.form.get('recipient')
        pn = request.form.get('pn', 'Unknown')
        sn = request.form.get('sn', 'Unknown')
        
        if 'pdf' not in request.files:
            return jsonify({"error": "No PDF file part"}), 400
            
        file = request.files['pdf']
        
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400
            
        if not recipient:
            return jsonify({"error": "Recipient email is required"}), 400

        # Generate HTML Body (Generic)
        fname = f"WCA_Official_{pn}_{sn}.pdf"
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif;">
            <h2>Official Aviation Document</h2>
            <p>Attached is the official document generated directly from the secure terminal.</p>
            <ul>
                <li><strong>Ref:</strong> {pn}</li>
                <li><strong>S/N:</strong> {sn}</li>
                <li><strong>Date:</strong> {datetime.now().strftime('%Y-%m-%d')}</li>
            </ul>
        </body>
        </html>
        """
        
        cfg = server_email.load_config()
        logs = []
        
        # Read file content
        pdf_bytes = file.read()
        
        files = [{
            'filename': fname,
            'content': pdf_bytes,
            'mimetype': 'application/pdf'
        }]
        
        subject = f"Official Document: {pn} (S/N: {sn})"
        
        success, message = server_email.send_via_smtp(cfg, recipient, subject, html_body, diagnostic_logs=logs, files=files)
        
        if success:
            logger.info(f"Client-side PDF email sent to {recipient}")
            return jsonify({"message": "Document sent successfully"}), 200
        else:
            logger.error(f"Failed to send client-side PDF: {message}")
            return jsonify({"error": message}), 500
            
    except Exception as e:
        logger.error(f"Upload Email Error: {e}")
        return jsonify({"error": str(e)}), 500

@reports_v2_bp.route('/contacts', methods=['GET'])
def get_contacts():
    """Get predefined contact list"""
    return jsonify([
        {"id": "1", "name": "Admin", "email": "admin@wca.com"},
        {"id": "2", "name": "Logistics Manager", "email": "logistics@worldclassaviation.com"},
        {"id": "3", "name": "Maintenance Team", "email": "maintenance@worldclassaviation.com"},
        {"id": "4", "name": "Ameriair Operations", "email": "ameriair.co@gmail.com"},
        {"id": "5", "name": "Operations", "email": "ops@worldclassaviation.com"}
    ])

# --- LEGACY ENDPOINT ---
@reports_v2_bp.route('/v2/generate', methods=['POST'])
def generate_legacy():
    """Legacy endpoint for backward compatibility"""
    try:
        payload = request.get_json(force=True, silent=True) or {}
        data = payload.get('data', [])
        meta = payload.get('meta', {})
        action = payload.get('action', 'PDF')
        r_type = meta.get('reportType', 'INVENTORY')

        r_type_slug = r_type.replace('_', '-').lower()
        fname = f"WCA_{r_type_slug}_{datetime.now().strftime('%Y%m%d')}"

        if action == 'EXCEL':
            df = pd.DataFrame(data)
            cols = ['loc','pn','desc','qty','cond','sn','manuf','lot','exp','trace','tag_date','tsn','csn','tso','cso','tsr','csr','uom']
            df = df[[c for c in cols if c in df.columns] + [c for c in df.columns if c not in cols]]
            
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
                df.to_excel(writer, index=False, sheet_name='Report')
                worksheet = writer.sheets['Report']
                worksheet.autofilter(0, 0, len(df), len(df.columns)-1)
                for i, col in enumerate(df.columns):
                    column_len = max(df[col].astype(str).map(len).max(), len(col)) + 2
                    worksheet.set_column(i, i, column_len)
            output.seek(0)
            return send_file(output, download_name=f"{fname}.xlsx", as_attachment=True, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

        elif action == 'PDF' or action == 'EMAIL':
            if r_type in ['LOCATION', 'BY_LOCATION']:
                pdf_buffer = generate_grouped_pdf(data, meta)
            else:
                pdf_buffer = generate_standard_pdf(data, meta)
            
            if action == 'EMAIL':
                return jsonify({'message': 'Use /send-email endpoint instead'}), 200
            return send_file(pdf_buffer, download_name=f"{fname}.pdf", as_attachment=True, mimetype='application/pdf')

        return jsonify({'error': 'Invalid Action'}), 400

    except Exception as e:
        logger.error(f"Legacy generate error: {e}")
        return jsonify({'error': str(e)}), 500
