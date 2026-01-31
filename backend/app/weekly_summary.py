
import os
import logging
import smtplib
from datetime import datetime
from sqlalchemy import text
from jinja2 import Environment, FileSystemLoader

# Local Imports
# Assuming this script is run as a module or with PYTHONPATH set correctly
try:
    from app.models import SessionLocal
    from app.server_email import send_via_smtp, load_config
    from app.storage_service import FINAL_STORAGE_PATH
except ImportError:
    # Use relative check if run differently (adjust based on container execution)
    from models import SessionLocal
    from server_email import send_via_smtp, load_config
    from storage_service import FINAL_STORAGE_PATH

# Configure Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("WeeklySummary")

def get_dir_size(path):
    total = 0
    try:
        for entry in os.scandir(path):
            if entry.is_file():
                total += entry.stat().st_size
            elif entry.is_dir():
                total += get_dir_size(entry.path)
    except Exception:
        pass
    return total

def format_bytes(size):
    power = 2**10
    n = 0
    power_labels = {0 : '', 1: 'K', 2: 'M', 3: 'G', 4: 'T'}
    while size > power:
        size /= power
        n += 1
    return f"{size:.2f} {power_labels[n]}B"

def count_weekly_files(base_path):
    """
    Counts files generated in the current week (approximation using current Year/Month logic if strictly persisted).
    For a strict 'weekly' count, we might need to actually check file creation times or just report stats for the current Month.
    The request asks for 'Total generated in the week'. 
    We will traverse /archives and check os.path.getmtime > 7 days ago.
    """
    stats = {}
    total_count = 0
    now = datetime.now()
    cutoff = now.timestamp() - (7 * 24 * 3600)

    for root, dirs, files in os.walk(base_path):
        for file in files:
            full_path = os.path.join(root, file)
            try:
                if os.path.getmtime(full_path) > cutoff:
                    # Extract Category from path structure:
                    # /archives/{Method}/{Category}/{Year}/{Month}/{File}
                    # rel_path = Method/Category/Year/Month/File
                    rel = os.path.relpath(full_path, base_path)
                    parts = rel.split(os.sep)
                    if len(parts) >= 2:
                        category = parts[1] # Index 0 is Method (Download/Email), Index 1 is Category
                    else:
                        category = "Unknown"
                    
                    stats[category] = stats.get(category, 0) + 1
                    total_count += 1
            except OSError:
                continue
                
    return stats, total_count

def check_db_health():
    session = SessionLocal()
    try:
        start = datetime.now()
        session.execute(text("SELECT 1"))
        latency = (datetime.now() - start).total_seconds() * 1000
        return True, round(latency, 2)
    except Exception as e:
        logger.error(f"DB Check Failed: {e}")
        return False, 0
    finally:
        session.close()

def generate_and_send_summary():
    logger.info("Starting Weekly System Report generation...")

    # 1. Gather Metrics
    db_ok, db_lat = check_db_health()
    
    storage_size_bytes = get_dir_size(FINAL_STORAGE_PATH)
    display_size = format_bytes(storage_size_bytes)
    
    activity_stats, total_files = count_weekly_files(FINAL_STORAGE_PATH)
    
    logger.info(f"Metrics: DB={db_ok}, Storage={display_size}, NewFiles={total_files}")

    # 2. Render Template
    template_dir = os.path.join(os.path.dirname(__file__), 'templates')
    env = Environment(loader=FileSystemLoader(template_dir))
    template = env.get_template('summary_email.html')
    
    html_content = template.render(
        date=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        hostname=os.getenv('HOSTNAME', 'Hangar-VPS'),
        db_status=db_ok,
        db_latency=db_lat,
        storage_usage=display_size,
        total_files=total_files,
        activity=activity_stats
    )

    # 3. Send Email
    cfg = load_config()
    # Assuming the first admin or a configured recipient. For now hardcoded or from config.
    # The prompt says "email administrators". I'll use the sender as recipient for test or 'admin@example.com'
    recipient = "operaciones@aerologistics.com" # Default fallback
    subject = "Weekly System Report [AUTO]"
    
    success, msg = send_via_smtp(cfg, recipient, subject, html_content)
    
    if success:
        logger.info("Weekly report sent successfully.")
    else:
        logger.error(f"Failed to send weekly report: {msg}")

if __name__ == "__main__":
    generate_and_send_summary()
