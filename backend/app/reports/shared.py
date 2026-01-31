
import logging
from reportlab.lib import colors

logger = logging.getLogger(__name__)

# --- ENTERPRISE BRANDING CONFIGURATION ---
REPORT_BRANDING = {
    'companyName': 'World Class Aviation',
    'logoPath': '/home/adolfo/Documents/Projects/hangar-management/backend/assets/logo.png',
    'primaryColor': colors.Color(0.72, 0.52, 0.04), # #b8860b Dark Gold
    'secondaryColor': colors.black,
    'footerText': 'Privileged Technical Record | World Class Aviation Logistics Terminal | FAA/EASA Compliance Support',
    'accentColor': colors.Color(0.12, 0.16, 0.23) # #1e293b Slate/Black
}

# --- STATUS TERMINOLOGY MAPPING ---
STATUS_DISPLAY_MAP = {
    'YELLOW': 'Serviceable Material',
    'GREEN': 'Repairable Material',
    'WHITE': 'Removed – No Defect',
    'RED': 'Rejected Material'
}

def get_report_branding():
    """Helper to return branding as serializable dict."""
    return {
        'companyName': REPORT_BRANDING['companyName'],
        'primaryColor': '#b8860b',
        'footerText': REPORT_BRANDING['footerText']
    }

# --- STRICT VISUAL CONTRACT CONFIGURATION ---
REPORT_COLUMN_CONFIG = {
    'TOTAL_INVENTORY': [
        ('statusLabel', 'Status'),
        ('pn', 'Part Number'),
        ('sn', 'Serial Number'),
        ('partName', 'Description'),
        ('brand', 'Brand'),
        ('model', 'Model'),
        ('location', 'Location'),
        ('physicalStorageLocation', 'Bin/Shelf'),
        ('registrationDate', 'Reg. Date'),
        ('tat', 'TAT/T.T'),
        ('tso', 'TSO'),
        ('trem', 'T.REM'),
        ('shelfLife', 'Shelf Life'),
        ('tc', 'T.C.'),
        ('cso', 'CSO'),
        ('crem', 'C.REM'),
        ('organization', 'Organization'),
        ('company_address', 'Address'),
        ('company_phone', 'Phone'),
        ('company_email', 'Email'),
        ('technician_name', 'Tech Name'),
        ('technician_license', 'Tech Lic.'),
        ('inspector_name', 'Insp. Name'),
        ('inspector_license', 'Insp. Lic.'),
        ('removalReason', 'Removal Reason'),
        ('rejectionReason', 'Rejection Reason'),
        ('finalDisposition', 'Disposition'),
        ('observations', 'Observations'),
        ('technicalReport', 'Technical Report'),
        ('id', 'System ID')
    ],
    'BY_STATUS': [
        ('statusLabel', 'Status'),
        ('pn', 'Part Number'),
        ('sn', 'Serial Number'),
        ('partName', 'Description'),
        ('brand', 'Brand'),
        ('model', 'Model'),
        ('location', 'Location'),
        ('physicalStorageLocation', 'Bin/Shelf'),
        ('registrationDate', 'Reg. Date'),
        ('tat', 'TAT/T.T'),
        ('tso', 'TSO'),
        ('trem', 'T.REM'),
        ('shelfLife', 'Shelf Life'),
        ('tc', 'T.C.'),
        ('cso', 'CSO'),
        ('crem', 'C.REM'),
        ('technician_name', 'Tech Name'),
        ('inspector_name', 'Insp. Name'),
        ('removalReason', 'Removal Reason'),
        ('rejectionReason', 'Rejection Reason'),
        ('observations', 'Observations')
    ],
    'BY_LOCATION': [
        ('location', 'Location'),
        ('statusLabel', 'Status'),
        ('pn', 'Part Number'),
        ('sn', 'Serial Number'),
        ('partName', 'Description'),
        ('brand', 'Brand'),
        ('model', 'Model'),
        ('physicalStorageLocation', 'Bin/Shelf'),
        ('registrationDate', 'Reg. Date'),
        ('tat', 'TAT/T.T'),
        ('trem', 'T.REM'),
        ('shelfLife', 'Shelf Life'),
        ('observations', 'Observations')
    ],
    'BY_PART_NUMBER': [
        ('pn', 'Part Number'),
        ('statusLabel', 'Status'),
        ('sn', 'Serial Number'),
        ('partName', 'Description'),
        ('brand', 'Brand'),
        ('location', 'Location'),
        ('tat', 'TAT/T.T'),
        ('tso', 'TSO'),
        ('trem', 'T.REM'),
        ('shelfLife', 'Shelf Life'),
        ('tc', 'T.C.'),
        ('cso', 'CSO'),
        ('crem', 'C.REM'),
        ('observations', 'Observations')
    ]
}

def format_report_items(items, report_type):
    """
    Architectural Formatter: Guarantees EXACT SAME columns and order for ALL reports.
    Source of Truth: REPORT_COLUMN_CONFIG
    """
    config = REPORT_COLUMN_CONFIG.get(report_type, [])
    if not config:
        # Fallback to keys of first item if config missing (fail-safe)
        if items:
            keys = sorted(items[0].keys())
            config = [(k, k.replace('_', ' ').title()) for k in keys]
        else:
            config = [('status', 'Status'), ('pn', 'P/N'), ('partName', 'Part Name')]

    columns = [{"key": k, "label": l} for k, l in config]
    rows = []
    
    if not items:
        # Task 4: Failure Safety - Empty structure
        return {
            "columns": columns,
            "rows": [],
            "meta": {"reportType": report_type, "rowCount": 0, "empty": True}
        }

    for item in items:
        row = {}
        for key, _ in config:
            val = item.get(key, '—')
            # Consistent formatting (Date/None)
            if val is None: val = '—'
            elif isinstance(val, (int, float)) and not isinstance(val, bool):
                val = str(val)
            row[key] = val
        rows.append(row)

    return {
        "columns": columns,
        "rows": rows,
        "meta": {
            "reportType": report_type,
            "rowCount": len(rows),
            "empty": False
        }
    }
