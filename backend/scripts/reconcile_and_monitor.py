#!/usr/bin/env python3
import sys
import os
import logging
import uuid
from datetime import datetime

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from backend.app.models import SessionLocal, ReportSnapshot, ComplianceLog
from backend.app.utils.normalization import normalize_snapshot_content, validate_snapshot_schema

# Configure Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - [RECONCILER] - %(levelname)s - %(message)s')
logger = logging.getLogger("Reconciler")

COMPLIANCE_DIR = os.environ.get('COMPLIANCE_REPORT_DIR', os.getcwd())

def reconcile_all_snapshots():
    """
    Scans entire ReportSnapshot table, audits integrity, repairs legacy data,
    and returns metrics.
    """
    db = SessionLocal()
    metrics = {
        "total_audited": 0,
        "valid_already": 0,
        "repaired": 0,
        "failed": 0,
        "details": []
    }
    
    try:
        snapshots = db.query(ReportSnapshot).all()
        logger.info(f"Starting reconciliation of {len(snapshots)} snapshots...")
        
        for snap in snapshots:
            metrics["total_audited"] += 1
            original_content = snap.content_snapshot
            
            # Step 1: Validate Schema
            is_valid, errors = validate_snapshot_schema(original_content)
            
            if is_valid:
                metrics["valid_already"] += 1
                continue
                
            # Step 2: Attempt Repair
            try:
                repaired_content = normalize_snapshot_content(original_content, snap.id)
                is_valid_now, new_errors = validate_snapshot_schema(repaired_content)
                
                if is_valid_now:
                    snap.content_snapshot = repaired_content
                    metrics["repaired"] += 1
                    metrics["details"].append({
                        "id": snap.id,
                        "status": "REPAIRED",
                        "repair_time": datetime.utcnow().isoformat()
                    })
                    
                    db.add(ComplianceLog(
                        id=str(uuid.uuid4()),
                        timestamp=datetime.utcnow(),
                        event_type='SNAPSHOT_RECONCILED',
                        severity='INFO',
                        component='Reconciler',
                        details={'report_id': snap.id, 'fix': 'Schema normalization'},
                        user_id='SYSTEM_RECONCILER'
                    ))
                else:
                    metrics["failed"] += 1
                    metrics["details"].append({
                        "id": snap.id,
                        "status": "FAILED",
                        "errors": new_errors
                    })
            except Exception as e:
                logger.error(f"Error repairing snapshot {snap.id}: {e}")
                metrics["failed"] += 1
                
        db.commit()
        return metrics
    except Exception as e:
        logger.error(f"Reconciliation critical failure: {e}")
        db.rollback()
        return None
    finally:
        db.close()

def generate_markdown_report(metrics):
    """ Writes the compliance report artifact. """
    timestamp = datetime.utcnow().isoformat()
    report_path = os.path.join(COMPLIANCE_DIR, "compliance_report.md")
    
    content = f"""# System Integrity & Compliance Report
Generated at: {timestamp}Z

## Reconciliation Metrics
| Metric | Value |
| :--- | :--- |
| **Total Audited** | {metrics['total_audited']} |
| **Valid (No Action Needed)** | {metrics['valid_already']} |
| **Repaired (Self-Healed)** | {metrics['repaired']} |
| **Failed (Manual Action Required)** | {metrics['failed']} |

## Integrity Rating: {round((metrics['valid_already'] + metrics['repaired']) / metrics['total_audited'] * 100, 2) if metrics['total_audited'] > 0 else 100}%

## Detailed Log
"""
    for entry in metrics['details']:
        if entry['status'] == 'REPAIRED':
            content += f"- ✅ Snapshot `{entry['id']}`: Repaired successfully.\n"
        else:
            content += f"- ❌ Snapshot `{entry['id']}`: Irreparable. Errors: {entry['errors']}\n"

    with open(report_path, "w") as f:
        f.write(content)
    
    return report_path

if __name__ == "__main__":
    results = reconcile_all_snapshots()
    if results:
        path = generate_markdown_report(results)
        print(f"COMPLIANCE_REPORT_GENERATED: {path}")
    else:
        print("RECONCILIATION_FAILED")
        sys.exit(1)
