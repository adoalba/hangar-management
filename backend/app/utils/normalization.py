import logging
from datetime import datetime
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import traceback

logger = logging.getLogger(__name__)

# --- ALERT SYSTEM ---

def send_critical_alert(subject, body, report_id=None, error=None, component="Reports"):
    """
    Send critical alert email to administrators.
    
    Args:
        subject: Email subject line
        body: Main message body
        report_id: Optional report ID for tracking
        error: Optional exception object
        component: System component name
    """
    try:
        # Get admin emails from environment or use default
        admin_emails = os.environ.get('ADMIN_ALERT_EMAILS', 'admin@worldclassaviation.com').split(',')
        smtp_host = os.environ.get('SMTP_HOST', 'localhost')
        smtp_port = int(os.environ.get('SMTP_PORT', '587'))
        smtp_user = os.environ.get('SMTP_USER', '')
        smtp_pass = os.environ.get('SMTP_PASS', '')
        
        # Build comprehensive email body
        full_body = f"""
CRITICAL ALERT - World Class Aviation Hangar System
{'=' * 60}

Component: {component}
Timestamp: {datetime.utcnow().isoformat()}Z
Report ID: {report_id or 'N/A'}

Message:
{body}

"""
        
        if error:
            full_body += f"""
Error Details:
{str(error)}

Stack Trace:
{traceback.format_exc()}
"""
        
        # Create email
        msg = MIMEMultipart()
        msg['From'] = smtp_user or 'sentinel@worldclassaviation.com'
        msg['To'] = ', '.join(admin_emails)
        msg['Subject'] = f"[CRITICAL] {subject}"
        msg.attach(MIMEText(full_body, 'plain'))
        
        # Send email
        if smtp_host and smtp_host != 'localhost':
            server = smtplib.SMTP(smtp_host, smtp_port)
            server.starttls()
            if smtp_user and smtp_pass:
                server.login(smtp_user, smtp_pass)
            server.send_message(msg)
            server.quit()
            logger.info(f"Critical alert sent to {len(admin_emails)} administrators")
        else:
            logger.warning(f"SMTP not configured. Alert would have been sent: {subject}")
            
    except Exception as e:
        logger.error(f"Failed to send critical alert: {e}")
        # Don't raise - alerting failure shouldn't break the main flow


# --- NORMALIZATION ---

def normalize_snapshot_content(content, report_id=None):
    """
    Architect's Reference: Guarantees consistent snapshot structure for all consumers.
    Ensures: reportId, generatedAt, items (flat), viewModel, filtersApplied, summary.
    """
    normalized = {
        "reportId": content.get("reportId", report_id or f"RPT-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"),
        "generatedAt": content.get("generatedAt", datetime.utcnow().isoformat() + 'Z'),
        "items": content.get("items", []),
        "viewModel": content.get("viewModel", {}),
        "filtersApplied": content.get("filtersApplied", {}),
        "summary": content.get("summary", {})
    }
    
    # 🕵️ Legacy Data Recovery
    if not normalized["items"]:
        # Scenario A: 'data' key (Direct list or dict with items)
        data_key = content.get("data")
        if isinstance(data_key, list):
            normalized["items"] = data_key
        elif isinstance(data_key, dict) and "items" in data_key:
            normalized["items"] = data_key["items"]
            
        # Scenario B: 'groupedData' (Need to flatten for generators)
        elif "groupedData" in content:
            gd = content["groupedData"]
            all_items = []
            if isinstance(gd, dict):
                for group in gd.values():
                    if isinstance(group, list):
                        all_items.extend(group)
                    elif isinstance(group, dict) and "items" in group:
                        all_items.extend(group["items"])
            normalized["items"] = all_items
            
    # viewModel backward compatibility
    if not normalized["viewModel"] and "groupedData" in content:
        normalized["viewModel"] = content["groupedData"]

    return normalized


def validate_snapshot_schema(data):
    """
    Validates if a snapshot adheres to the Master Contract.
    Returns: (is_valid, list_of_errors)
    """
    errors = []
    
    if not isinstance(data, dict):
        return False, ["Snapshot content must be a dictionary"]
        
    required_keys = ['reportId', 'generatedAt', 'items', 'viewModel']
    for key in required_keys:
        if key not in data:
            errors.append(f"Missing required key: {key}")
            
    if 'items' in data and not isinstance(data['items'], list):
        errors.append("'items' must be a list")
        
    if 'viewModel' in data and not isinstance(data['viewModel'], dict):
        errors.append("'viewModel' must be a dictionary")
        
    return len(errors) == 0, errors


def repair_snapshot_on_load(snapshot_data, report_id, source="UNKNOWN"):
    """
    Comprehensive repair wrapper for snapshots loaded from database.
    
    Args:
        snapshot_data: Raw snapshot content from DB
        report_id: Report identifier for logging
        source: Where this snapshot was loaded from (e.g., "download", "email")
    
    Returns:
        Normalized snapshot data or None if irreparable
    """
    try:
        # Step 1: Validate schema
        is_valid, errors = validate_snapshot_schema(snapshot_data)
        
        if not is_valid:
            logger.warning(f"Snapshot {report_id} validation failed from {source}: {errors}")
            
            # Step 2: Attempt normalization
            normalized = normalize_snapshot_content(snapshot_data, report_id)
            
            # Step 3: Re-validate after normalization
            is_valid_post, errors_post = validate_snapshot_schema(normalized)
            
            if is_valid_post:
                logger.info(f"Successfully repaired snapshot {report_id} from {source}")
                return normalized
            else:
                # Critical: snapshot is irreparable
                logger.error(f"CRITICAL: Snapshot {report_id} is irreparable after normalization. Errors: {errors_post}")
                send_critical_alert(
                    f"Irreparable Snapshot Detected: {report_id}",
                    f"Source: {source}\nValidation errors: {errors_post}\n\nSnapshot cannot be used for report generation.",
                    report_id=report_id
                )
                return None
        else:
            # Snapshot is already valid
            return snapshot_data
            
    except Exception as e:
        logger.error(f"Exception during snapshot repair for {report_id}: {e}")
        send_critical_alert(
            f"Snapshot Repair Failed: {report_id}",
            f"Exception occurred during repair attempt.\nSource: {source}",
            report_id=report_id,
            error=e
        )
        return None


def reconcile_all_snapshots(db_session=None):
    """
    Detects and normalizes all snapshots legacy across the database.
    Can be run from Sentinel or via CLI utility.
    """
    if not db_session:
        from ..models import SessionLocal
        session = SessionLocal()
    else:
        session = db_session

    try:
        from ..models import ReportSnapshot
        snapshots = session.query(ReportSnapshot).yield_per(100)
        fixes = 0
        for snap in snapshots:
            try:
                original = snap.content_snapshot
                content = normalize_snapshot_content(original, snap.id)
                if content != original:
                    snap.content_snapshot = content
                    session.add(snap)
                    fixes += 1
            except Exception as e:
                logger.error(f"Failed to reconcile snapshot {snap.id}: {e}")
        
        session.commit()
        logger.info(f"Reconciliation complete. Fixed {fixes} snapshots.")
    finally:
        if not db_session:
            session.close()
