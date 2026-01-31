
from datetime import datetime
import uuid

# FAA/EASA Terminology Map (Exact English)
STATUS_MAP = {
    'YELLOW': 'Serviceable Material',
    'GREEN': 'Repairable Material',
    'WHITE': 'Removed – No Defect',
    'RED': 'Rejected Material'
}

def map_db_item_to_domain(item) -> dict:
    """Safe mapping of DB AviationPart to Report Dictionary."""
    if not item:
        return {}
        
    tag = getattr(item, 'tag_color', 'WHITE')
    status_label = STATUS_MAP.get(tag, 'Removed – No Defect') # Default safe
    
    return {
        'id': str(getattr(item, 'id', '') or ''),
        'pn': str(getattr(item, 'pn', '') or '—'),
        'sn': str(getattr(item, 'sn', '') or '—'),
        'partName': str(getattr(item, 'part_name', '') or '—'),
        'brand': str(getattr(item, 'brand', '') or '—'),
        'model': str(getattr(item, 'model', '') or '—'),
        'location': str(getattr(item, 'location', '') or '—'),
        'status': tag, # Internal code
        'statusLabel': status_label, # strict english
        'registrationDate': str(getattr(item, 'registration_date', '') or '—'),
        'condition': status_label, # Alias
        'tagColor': tag,
        # Tech Data
        'tat': str(getattr(item, 'tt_tat', '') or '—'),
        'tso': str(getattr(item, 'tso', '') or '—'),
        'shelfLife': str(getattr(item, 'shelf_life', '') or '—'),
        # Auditors
        'technician': str(getattr(item, 'technician_name', '') or '—'),
        'inspector': str(getattr(item, 'inspector_name', '') or '—'),
        # Full params required by column config
        'removalReason': str(getattr(item, 'removal_reason', '') or '—'),
        'rejectionReason': str(getattr(item, 'rejection_reason', '') or '—'),
        'physicalStorageLocation': str(getattr(item, 'physical_storage_location', '') or '—'),
        'finalDisposition': str(getattr(item, 'final_disposition', '') or '—'),
        'observations': str(getattr(item, 'observations', '') or '—'),
        'technicalReport': str(getattr(item, 'technical_report', '') or '—'),
        'organization': str(getattr(item, 'organization', '') or '—')
    }

def build_snapshot(items: list, filters: dict, user_name: str, report_type: str) -> dict:
    """Creates the immutable snapshot structure."""
    
    report_id = f"RPT-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    
    domain_items = [map_db_item_to_domain(i) for i in items]
    
    # Calculate Summary
    total = len(domain_items)
    by_status = {'YELLOW': 0, 'GREEN': 0, 'WHITE': 0, 'RED': 0}
    for i in domain_items:
        t = i.get('tagColor', 'WHITE')
        if t in by_status: 
            by_status[t] += 1
            
    summary = {
        'total': total,
        'byStatus': by_status,
        'generatedAt': datetime.utcnow().isoformat() + 'Z'
    }

    return {
        'reportId': report_id,
        'reportType': report_type,
        'generatedAt': summary['generatedAt'],
        'generatedBy': user_name,
        'filtersApplied': filters,
        'items': domain_items,
        'summary': summary,
        'version': 'v2.0'
    }
