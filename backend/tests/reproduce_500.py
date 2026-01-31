
import sys
import os
import io
import json
import logging
import unittest
from datetime import datetime

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Set Test DB URL
test_db_path = "/tmp/test_hangar_repro.db"
if os.path.exists(test_db_path):
    os.remove(test_db_path)
os.environ['DATABASE_URL'] = f"sqlite:///{test_db_path}"

from app.models import Base, engine, SessionLocal, User, AviationPart
from app.main import app
from werkzeug.security import generate_password_hash
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Repro500")

class TestRepro500(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = app.test_client()
        cls.db = SessionLocal()
        
        # Create Admin
        admin = User(
            id=str(uuid.uuid4()),
            name="Audit Admin",
            username="admin_repro",
            email="repro@example.com",
            password=generate_password_hash("pass"),
            role="ADMIN",
            active=True
        )
        cls.db.add(admin)
        cls.db.commit()
        
        # Login
        resp = cls.client.post('/api/login-check', json={"username": "admin_repro", "password": "pass"})
        cls.token = resp.json['token']
        cls.headers = {
            'Authorization': f'Bearer {cls.token}',
            'Content-Type': 'application/json'
        }

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_filter_as_list(self):
        """Test sending location as a LIST instead of STRING"""
        logger.info("TEST: Filter as LIST (Potential Crash)")
        payload = {
            "reportType": "TOTAL_INVENTORY",
            "filters": {
                "location": ["Zone A", "Zone B"], # Frontend might send this
                "status": ["RED"]
            }
        }
        resp = self.client.post('/api/reports/generate', headers=self.headers, json=payload)
        logger.info(f"Response: {resp.status_code}")
        if resp.status_code == 500:
             logger.error("CRASH DETECTED: List in filter caused 500")
        self.assertNotEqual(resp.status_code, 500, "Should not crash on List input")

    def test_filter_as_null(self):
        """Test sending null filters"""
        logger.info("TEST: Filter as NULL")
        payload = {
            "reportType": "TOTAL_INVENTORY",
            "filters": {
                "location": None,
                "status": None
            }
        }
        resp = self.client.post('/api/reports/generate', headers=self.headers, json=payload)
        self.assertNotEqual(resp.status_code, 500)

if __name__ == '__main__':
    unittest.main()
