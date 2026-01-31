
import sys
import os
import unittest
import logging
import json
import secrets
from datetime import datetime

# Setup
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.main import app
from app.models import User, SessionLocal, AviationPart
from werkzeug.security import generate_password_hash
import uuid

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ArchAudit")

class TestFullArch(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        cls.client = app.test_client()
        cls.db = SessionLocal()
        
        # Ensure Admin
        username = f"arch_admin_{secrets.token_hex(4)}"
        admin = User(id=str(uuid.uuid4()), name="Admin", username=username, email="a@a.com", password=generate_password_hash("p"), role="ADMIN")
        cls.db.add(admin)
        cls.db.commit()
        
        # Login
        resp = cls.client.post('/api/login-check', json={"username": username, "password": "p"})
        cls.token = resp.json['token']
        cls.headers = {'Authorization': f'Bearer {cls.token}'}
        
    def test_1_inventory_persistence(self):
        """Test Inventory Save (Mocking client sync)."""
        logger.info("TEST 1: Inventory Save")
        pn = f"PN-{secrets.token_hex(4)}"
        sn = f"SN-{secrets.token_hex(4)}"
        
        payload = [{
            "pn": pn,
            "sn": sn,
            "partName": "Test Architecture Part",
            "tagColor": "YELLOW",
            "location": "Shelf A"
        }]
        
        resp = self.client.post('/api/inventory', headers=self.headers, json=payload)
        self.assertEqual(resp.status_code, 200)
        
        # Verify in DB
        part = self.db.query(AviationPart).filter_by(pn=pn, sn=sn).first()
        self.assertIsNotNone(part)
        self.assertEqual(part.tag_color, "YELLOW")
        logger.info(f"Part {pn} persisted in DB.")
        
    def test_2_report_archive(self):
        """Test V2 PDF Generation & Archival."""
        logger.info("TEST 2: Report Archival")
        payload = {"reportType": "ARCH_TEST", "filters": {}}
        resp = self.client.post('/api/reports/v2/generate_pdf', headers=self.headers, json=payload)
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json.get('archived'))
        
    def test_3_archive_list(self):
        """Test Archives Listing."""
        logger.info("TEST 3: List Archives")
        resp = self.client.get('/api/reports/v2/archives', headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        files = resp.json.get('data', [])
        self.assertTrue(len(files) > 0)
        logger.info(f"Found {len(files)} archives.")

if __name__ == '__main__':
    unittest.main()
