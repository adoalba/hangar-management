
import os
import sys
import logging

# Setup Path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Env Overrides for Testing
os.environ['DB_PATH'] = '/tmp/smoke_test.db'
os.environ['STORAGE_ROOT'] = '/tmp/storage_test'
os.environ['LOG_DIR'] = '/tmp/logs'

from app.main import create_app
from app.reports.pdf_engine import generate_pdf_report
from app.storage_service import UnifiedArchiveService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("TEST_SCRIPT")

def test_generation():
    print("--- STARTING GENERATION TEST ---")
    app = create_app()
    
    with app.app_context():
        # Mock Data
        report_data = {
            "reportId": "TEST-RPT-001",
            "reportType": "TOTAL_INVENTORY",
            "generatedAt": "2026-01-30 12:00:00",
            "items": [
                {"pn": "123-ABC", "partName": "Test Part", "statusLabel": "Serviceable", "location": "Warehouse A"}
            ]
        }
        
        # 1. Generate PDF
        print("1. Generating PDF...")
        pdf_buffer = generate_pdf_report(report_data)
        print(f"   Buffer Size: {len(pdf_buffer.getvalue())} bytes")
        
        # 2. Persist
        print("2. Persisting to Disk...")
        try:
            path = UnifiedArchiveService.persist_report(pdf_buffer, "test_report", "PDF", "TOTAL_INVENTORY", "Download")
            print(f"   SUCCESS: Saved to {path}")
        except Exception as e:
            print(f"   FAILED: {e}")
            import traceback
            traceback.print_exc()
            exit(1)
            
    print("--- TEST COMPLETED SUCCESSFULLY ---")

if __name__ == "__main__":
    test_generation()
