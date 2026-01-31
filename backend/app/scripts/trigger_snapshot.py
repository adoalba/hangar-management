
import sys
import os

# Ensure we can import app modules
sys.path.append('/app')

from app.main import app, get_db
from app.reports_v2.services import generate_daily_snapshot_logic

def run():
    print("Starting Daily Snapshot Job...")
    with app.app_context():
        try:
            db = get_db()
            result = generate_daily_snapshot_logic(db, user_id="CRON_JOB")
            print(f"SUCCESS: Snapshot saved to {result['path']}")
            print(f"Items Captured: {result['items_count']}")
        except Exception as e:
            print(f"CRITICAL: Snapshot Job Failed: {e}")
            sys.exit(1)

if __name__ == "__main__":
    run()
