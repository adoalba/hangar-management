
from ..models import SessionLocal, AviationPart
from sqlalchemy import func, or_
from flask import g
import logging

logger = logging.getLogger(__name__)

def get_db():
    """Get database session from Flask g context."""
    if 'db' not in g:
        g.db = SessionLocal()
    return g.db

def fetch_inventory_safe(filters: dict) -> list:
    """
    DAL: Fetch inventory with strict filter sanitization.
    NEVER throws exception. Returns [] on error.
    """
    try:
        db = get_db()
        query = db.query(AviationPart)
        
        # Defensive Copy
        safe_filters = filters.copy() if filters else {}
        
        # 1. Sanitize & Apply Location
        loc = safe_filters.get('location')
        if isinstance(loc, list):
            locs = [str(x) for x in loc if x]
            if locs:
                query = query.filter(func.lower(AviationPart.location).in_([l.lower() for l in locs]))
        elif isinstance(loc, str) and loc.strip():
             # Legacy comma-separated support just in case, or single value
             if ',' in loc:
                 locs = [l.strip().lower() for l in loc.split(',') if l.strip()]
                 query = query.filter(func.lower(AviationPart.location).in_(locs))
             else:
                 query = query.filter(func.lower(AviationPart.location) == loc.lower().strip())

        # 2. Sanitize & Apply Status (Tag Color)
        stat = safe_filters.get('status')
        if isinstance(stat, list):
            stats = [str(x).upper() for x in stat if x]
            if stats:
                query = query.filter(AviationPart.tag_color.in_(stats))
        elif isinstance(stat, str) and stat.strip():
             if ',' in stat:
                 stats = [s.strip().upper() for s in stat.split(',') if s.strip()]
                 query = query.filter(AviationPart.tag_color.in_(stats))
             else:
                 query = query.filter(AviationPart.tag_color == stat.upper().strip())

        # 3. Sanitize & Apply Category (Search)
        cat = safe_filters.get('category')
        if isinstance(cat, list):
             # If list, join or OR logic? Usually search is single string.
             # We'll treat as "OR" matches on any keyword
             keywords = [str(x) for x in cat if x]
             if keywords:
                 conditions = [AviationPart.part_name.ilike(f'%{k}%') for k in keywords]
                 query = query.filter(or_(*conditions))
        elif isinstance(cat, str) and cat.strip():
             # Comma logic
             if ',' in cat:
                 keywords = [c.strip() for c in cat.split(',') if c.strip()]
                 conditions = [AviationPart.part_name.ilike(f'%{k}%') for k in keywords]
                 query = query.filter(or_(*conditions))
             else:
                 query = query.filter(AviationPart.part_name.ilike(f'%{cat.strip()}%'))

        # 4. Dates
        d_from = safe_filters.get('dateFrom') or safe_filters.get('date_from')
        if d_from and isinstance(d_from, str) and d_from.strip():
            query = query.filter(AviationPart.registration_date >= d_from.strip())
            
        d_to = safe_filters.get('dateTo') or safe_filters.get('date_to')
        if d_to and isinstance(d_to, str) and d_to.strip():
            query = query.filter(AviationPart.registration_date <= d_to.strip())

        # Default Sort: Registration Date DESC
        query = query.order_by(AviationPart.registration_date.desc())
        
        return query.all()
        
    except Exception as e:
        logger.error(f"DAL_V2_ERROR: {e}")
        return []
