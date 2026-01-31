
import sys
import os
import time
import logging
import traceback
import smtplib
from datetime import datetime, timedelta
import uuid

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../'))

from backend.app.models import SessionLocal, ReportSnapshot, ComplianceLog, AviationPart
from backend.app.utils.normalization import normalize_snapshot_content, validate_snapshot_schema, send_critical_alert
from backend.scripts.daily_compliance import generate_daily_report

# Import generators for validation
try:
    from backend.app.reports import generate_pdf_report, generate_csv_content, generate_excel_report
except ImportError:
    generate_pdf_report = None 
    generate_csv_content = None
    generate_excel_report = None

# Configure Logging
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - [SENTINEL] - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("logs/sentinel.log") if os.path.exists("logs") else logging.NullHandler()
    ]
)
logger = logging.getLogger("Sentinel")

REPORT_INTERVAL_HOURS = 1

def check_inventory_health(db):
    """
    Validate internal consistency of AviationPart table.
    """
    logger.info("🛡️  Running Inventory Health Check...")
    issues = []
    
    # 1. Check for orphaned parts (missing required fields)
    invalid_parts = db.query(AviationPart).filter(
        (AviationPart.part_name == None) | (AviationPart.part_name == '')
    ).all()
    
    if invalid_parts:
        msg = f"Found {len(invalid_parts)} parts with missing Part Name."
        issues.append(msg)
        logger.warning(msg)
        
    # 2. Check for duplicate IDs (Should be DB constraint, but audit logic check)
    # Skipped as ID is PK.
    
    if issues:
        db.add(ComplianceLog(
            id=str(uuid.uuid4()),
            timestamp=datetime.utcnow(),
            event_type='INVENTORY_HEALTH',
            severity='WARNING',
            component='Sentinel',
            details={'issues': issues},
            user_id='SENTINEL'
        ))
    
    return len(issues) == 0

def validate_and_repair_snapshots(db):
    """
    Iterate snapshots, normalize, and DRY-RUN generators.
    """
    logger.info("🛡️  Running Snapshot Validation & Repair...")
    snapshots = db.query(ReportSnapshot).all()
    
    for snap in snapshots:
        try:
            content = snap.content_snapshot
            
            # 1. Normalization (Auto-Repair)
            # We call normalize every time to ensure compliance even if code changes
            normalized = normalize_snapshot_content(content, snap.id)
            
            # Check if it changed
            if normalized != content:
                snap.content_snapshot = normalized
                logger.info(f"Fixed snapshot {snap.id}")
                db.add(ComplianceLog(
                    id=str(uuid.uuid4()),
                    timestamp=datetime.utcnow(),
                    event_type='SNAPSHOT_FIX',
                    severity='INFO',
                    component='Sentinel',
                    details={'report_id': snap.id, 'action': 'Normalized'},
                    user_id='SENTINEL'
                ))

            # 2. Generator Validation (The "Aggressive" part)
            # Try producing artifacts. If this crashes or returns an error string, the snapshot is dangerous.
            try:
                if generate_pdf_report:
                    _ = generate_pdf_report(normalized)
                if generate_excel_report:
                    _ = generate_excel_report(normalized)
                if generate_csv_content:
                    csv_res = generate_csv_content(normalized)
                    if isinstance(csv_res, str) and csv_res.startswith("ERROR:"):
                        raise ValueError(f"CSV Generator returned error: {csv_res}")
            except Exception as e:
                logger.error(f"❌ CRITICAL: Snapshot {snap.id} crashes generators: {e}")
                db.add(ComplianceLog(
                    id=str(uuid.uuid4()),
                    timestamp=datetime.utcnow(),
                    event_type='SNAPSHOT_CRASH',
                    severity='CRITICAL',
                    component='Sentinel',
                    details={'report_id': snap.id, 'error': str(e)},
                    user_id='SENTINEL'
                ))
                send_critical_alert(
                    f"Generator Crash: {snap.id}",
                    f"A dry-run of the report generators failed for snapshot {snap.id}.\nError: {e}",
                    report_id=snap.id,
                    error=e,
                    component="Sentinel:GeneratorValidation"
                )

        except Exception as e:
            logger.error(f"Error processing {snap.id}: {e}")

    db.commit()

def run_sentinel_loop():
    logger.info("🔥 SENTINEL SYSTEM STARTED - 24/7 MONITORING ACTIVE")
    
    while True:
        start_time = datetime.utcnow()
        db = SessionLocal()
        
        try:
            # 1. Inventory Health
            check_inventory_health(db)
            
            # 2. Snapshot Reconciliation & Validation
            validate_and_repair_snapshots(db)
            
            # 3. Compliance Report
            # We run this every loop (hourly) as requested, or can filter by time
            generate_daily_report() 
            
            db.commit()
            
        except Exception as e:
            logger.error(f"Global Sentinel Failure: {e}")
            traceback.print_exc()
            db.rollback()
            send_alert_email("Sentinel Loop Crashed", str(e), is_critical=True)
        finally:
            db.close()
            
        # Sleep logic
        elapsed = (datetime.utcnow() - start_time).total_seconds()
        sleep_time = max(0, (REPORT_INTERVAL_HOURS * 3600) - elapsed)
        logger.info(f"Cycle complete. Sleep for {sleep_time/60:.1f} minutes.")
        
        # In this task context (one-off execution for user), we might want to run once.
        # But the requirement is a loop. I will allow it to sleep.
        # For the user's immediate verification, I will make the sleep short or configurable via env?
        # Requirement: "Corre en loop infinito 24/7"
        if "--once" in sys.argv:
            break
            
        time.sleep(sleep_time)

if __name__ == "__main__":
    # Allow fast run for verification
    if os.environ.get("Sentinel_FAST_RUN"):
        REPORT_INTERVAL_HOURS = 0.001 # Run almost instantly
        
    if "--once" in sys.argv:
        logger.info("Running in ONCE mode. Exiting after one cycle.")
        run_sentinel_loop()
        sys.exit(0)
        
    run_sentinel_loop()
