
import sys
import os
import json
import logging
import uuid
from datetime import datetime

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../'))

from backend.app.models import SessionLocal, ReportSnapshot, ComplianceLog
from backend.app.utils.normalization import normalize_snapshot_content, validate_snapshot_schema

# Configure Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("ReconcileSnapshots")

def reconcile_snapshots():
    """
    Audit and repair all snapshots in the database.
    """
    db = SessionLocal()
    try:
        snapshots = db.query(ReportSnapshot).all()
        logger.info(f"Starting reconciliation for {len(snapshots)} snapshots...")
        
        repaired_count = 0
        valid_count = 0
        failed_count = 0
        
        for snap in snapshots:
            content = snap.content_snapshot
            
            # 1. Validate
            is_valid, errors = validate_snapshot_schema(content)
            
            if is_valid:
                valid_count += 1
                continue
                
            # 2. Attempt Repair
            logger.warning(f"Snapshot {snap.id} is invalid. Errors: {errors}. Attempting repair...")
            
            try:
                # Use shared normalization logic
                repaired_content = normalize_snapshot_content(content, snap.id)
                
                # Re-validate locally to ensure our repair worked
                is_valid_post, post_errors = validate_snapshot_schema(repaired_content)
                
                if is_valid_post:
                    # Update DB
                    snap.content_snapshot = repaired_content
                    # Log Compliance Action
                    audit_log = ComplianceLog(
                        id=str(uuid.uuid4()),
                        timestamp=datetime.utcnow(),
                        event_type='SNAPSHOT_FIX',
                        severity='WARNING',
                        component='ReconciliationScript',
                        details={
                            'report_id': snap.id,
                            'original_errors': errors,
                            'action': 'Normalized content structure'
                        },
                        user_id='SYSTEM_SRE'
                    )
                    db.add(audit_log)
                    repaired_count += 1
                    logger.info(f"Snapshot {snap.id} repaired successfully.")
                else:
                    # Mark as Critical Failure
                    audit_log = ComplianceLog(
                        id=str(uuid.uuid4()),
                        timestamp=datetime.utcnow(),
                        event_type='REPAIR_FAILURE',
                        severity='CRITICAL',
                        component='ReconciliationScript',
                        details={
                            'report_id': snap.id,
                            'errors': post_errors,
                            'msg': 'Normalization failed to satisfy schema'
                        },
                        user_id='SYSTEM_SRE'
                    )
                    db.add(audit_log)
                    failed_count += 1
                    logger.error(f"Failed to repair snapshot {snap.id}.")
                    
            except Exception as e:
                logger.error(f"Exception fixing snapshot {snap.id}: {e}")
                failed_count += 1

        db.commit()
        
        # Summary Log
        summary_log = ComplianceLog(
            id=str(uuid.uuid4()),
            timestamp=datetime.utcnow(),
            event_type='RECONCILIATION_RUN',
            severity='INFO',
            component='ReconciliationScript',
            details={
                'total': len(snapshots),
                'valid': valid_count,
                'repaired': repaired_count,
                'failed': failed_count
            },
            user_id='SYSTEM_SRE'
        )
        db.add(summary_log)
        db.commit()
        
        logger.info("Reconciliation Complete.")
        logger.info(f"Valid: {valid_count} | Repaired: {repaired_count} | Failed: {failed_count}")
        
    except Exception as e:
        logger.error(f"Global script failure: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reconcile_snapshots()
