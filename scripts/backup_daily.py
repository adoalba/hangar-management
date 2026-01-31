
import os
import shutil
import sqlite3
import datetime
import logging
import sys

# Configure Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("DailyBackup")

# Constants
IS_CONTAINER = os.path.exists("/app")
BASE_DIR = "/app" if IS_CONTAINER else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data") if IS_CONTAINER else BASE_DIR

DB_PATH = os.path.join(DATA_DIR, "inventory.db")
BACKUP_ROOT = os.path.join(BASE_DIR, "backups") # /app/backups or local/backups
ARCHIVE_SOURCE = os.path.join(BASE_DIR, "storage", "archives")

os.makedirs(BACKUP_ROOT, exist_ok=True)

def perform_db_backup(timestamp_str):
    """Safely backup SQLite DB using VACUUM INTO for consistency."""
    if not os.path.exists(DB_PATH):
        logger.error(f"Database not found at {DB_PATH}")
        return False
        
    backup_file = os.path.join(BACKUP_ROOT, f"inventory_{timestamp_str}.db")
    
    try:
        # Use SQLite Online Backup API (VACUUM INTO) for safety during writes
        # This requires SQLite 3.27+
        conn = sqlite3.connect(DB_PATH)
        conn.execute(f"VACUUM INTO '{backup_file}'")
        conn.close()
        logger.info(f"Database backed up to {backup_file}")
        return True
    except Exception as e:
        logger.error(f"DB Backup Failed: {e}")
        # Fallback to copy if VACUUM fails (less safe but better than nothing)
        try:
             shutil.copy2(DB_PATH, backup_file)
             logger.warning("Fallback: Performed direct file copy.")
             return True
        except Exception as copy_err:
             logger.error(f"Fallback Copy Failed: {copy_err}")
             return False

def perform_archive_backup(timestamp_str):
    """Compress the PDF archives folder."""
    if not os.path.exists(ARCHIVE_SOURCE) or not os.listdir(ARCHIVE_SOURCE):
        logger.info("No archives to backup.")
        return True
        
    zip_name = os.path.join(BACKUP_ROOT, f"archives_{timestamp_str}")
    try:
        shutil.make_archive(zip_name, 'zip', ARCHIVE_SOURCE)
        logger.info(f"Archives compressed to {zip_name}.zip")
        return True
    except Exception as e:
        logger.error(f"Archive Backup Failed: {e}")
        return False

def prune_old_backups(days_to_keep=7):
    """Remove backups older than N days."""
    now = datetime.datetime.now()
    cutoff = now - datetime.timedelta(days=days_to_keep)
    
    for filename in os.listdir(BACKUP_ROOT):
        filepath = os.path.join(BACKUP_ROOT, filename)
        if os.path.isfile(filepath):
            t = os.path.getmtime(filepath)
            if datetime.datetime.fromtimestamp(t) < cutoff:
                try:
                    os.remove(filepath)
                    logger.info(f"Pruned old backup: {filename}")
                except Exception as e:
                    logger.error(f"Failed to prune {filename}: {e}")

if __name__ == "__main__":
    logger.info("Starting Daily Backup Routine...")
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    
    db_ok = perform_db_backup(ts)
    arch_ok = perform_archive_backup(ts)
    
    if db_ok and arch_ok:
        logger.info("Backup Routine Completed Successfully.")
        prune_old_backups()
        sys.exit(0)
    else:
        logger.error("Backup Routine Completed with Errors.")
        sys.exit(1)
