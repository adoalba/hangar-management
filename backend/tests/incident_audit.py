
import sys
import os
import io
import json
import logging
import unittest
from datetime import datetime

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Set Test DB URL BEFORE importing models
test_db_path = "/tmp/test_hangar_incident.db"
if os.path.exists(test_db_path):
    os.remove(test_db_path)
os.environ['DATABASE_URL'] = f"sqlite:///{test_db_path}"

from app.models import Base, engine, SessionLocal, User, AviationPart
from app.main import app
from werkzeug.security import generate_password_hash
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("IncidentAudit")

class TestIncidentReport(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        logger.info("Setting up Test Environment...")
        Base.metadata.create_all(bind=engine)
        cls.client = app.test_client()
        cls.db = SessionLocal()
        
        # Create Admin
        admin = User(
            id=str(uuid.uuid4()),
            name="Audit Admin",
            username="admin_audit",
            email="audit@example.com",
            password=generate_password_hash("auditPass1!"),
            role="ADMIN",
            active=True
        )
        cls.db.add(admin)
        
        # Create Data
        part1 = AviationPart(
            id="audit-part-1",
            pn="AUD-PN-001",
            sn="AUD-SN-001",
            part_name="Audit Part 1",
            tag_color="YELLOW",
            registration_date="2024-01-01",
            location="Zone A",
            brand="Boeing", 
            model="737"
        )
        part2 = AviationPart(
            id="audit-part-2",
            pn="AUD-PN-002",
            sn="AUD-SN-002",
            part_name="Audit Part 2",
            tag_color="RED",
            registration_date="2024-02-01",
            location="Zone B",
            brand="Airbus", 
            model="A320"
        )
        cls.db.add(part1)
        cls.db.add(part2)
        cls.db.commit()
        
        # Login
        resp = cls.client.post('/api/login-check', json={"username": "admin_audit", "password": "auditPass1!"})
        cls.token = resp.json['token']
        cls.headers = {'Authorization': f'Bearer {cls.token}'}
        logger.info("Setup Complete. Token Acquired.")

    @classmethod
    def tearDownClass(cls):
        cls.db.close()
        # os.remove(test_db_path) # Keep for debugging if needed

    def test_01_generate_inventory_report(self):
        """Step 1: Verify Total Inventory Report Generation"""
        logger.info("TEST: Generate Total Inventory Report")
        resp = self.client.get('/api/reports/inventory', headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json
        self.assertIn('reportId', data)
        self.assertIn('data', data)
        self.assertEqual(len(data['data']), 2)
        self.__class__.report_id_inventory = data['reportId']
        logger.info(f"Inventory Report Generated: {data['reportId']}")

    def test_02_pdf_download_inventory(self):
        """Step 2: Verify PDF Download (Content & Headers)"""
        logger.info("TEST: Download PDF for Inventory")
        report_id = self.__class__.report_id_inventory
        resp = self.client.get(f'/api/reports/{report_id}/download?format=PDF', headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(len(resp.data) > 1000, "PDF too small")
        self.assertTrue(resp.data.startswith(b'%PDF'), "Invalid PDF Magic Bytes")
        logger.info("PDF Download Validated.")

    def test_03_excel_download_inventory(self):
        """Step 3: Verify Excel Download"""
        logger.info("TEST: Download Excel for Inventory")
        report_id = self.__class__.report_id_inventory
        resp = self.client.get(f'/api/reports/{report_id}/download?format=EXCEL', headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(len(resp.data) > 1000, "Excel too small")
        # Magic bytes for xlsx (PK zip)
        self.assertTrue(resp.data.startswith(b'PK'), "Invalid Excel Magic Bytes")
        logger.info("Excel Download Validated.")

    def test_04_email_generation_check(self):
        """Step 4: Verify Email HTML Generation (Mock Send)"""
        logger.info("TEST: Verify Email Generation logic (Mock)")
        # We can't actually send email without SMTP, but we can verify the endpoint doesn't 500
        # The endpoint attempts to send. 
        # We'll use a snapshot retrieval test via internal function if possible, 
        # or we will try /email and expect a "Connection Refused" (500) or check purely for generation errors.
        # Actually, best way is to import the function and test the string generation.
        
        from app.reports import generate_report_email_html
        
        # Create dummy data
        data = {
            'reportId': 'TEST-RPT', 
            'reportType': 'TEST_TYPE',
            'summary': {'total': 10}
        }
        
        html = generate_report_email_html(data)
        self.assertIn('TEST-RPT', html)
        self.assertIn('Test Type', html) # Title cased
        self.assertIn('color: #000000', html) # Check high contrast
        logger.info("Email HTML Template Validated.")

    def test_05_by_status_report(self):
        """Step 5: Verify By Status Report"""
        logger.info("TEST: Generate By Status Report")
        resp = self.client.get('/api/reports/by-status', headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json
        self.assertIn('reportId', data)
        self.assertTrue(data['summary']['byStatus']['YELLOW'] > 0)
        logger.info(f"Status Report Generated: {data['reportId']}")

    def test_06_by_location_report(self):
        """Step 6: Verify By Location Report"""
        logger.info("TEST: Generate By Location Report")
        resp = self.client.get('/api/reports/by-location', headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json
        self.assertIn('reportId', data)
        self.assertTrue(len(data['locationSummary']) >= 2)
        logger.info(f"Location Report Generated: {data['reportId']}")

if __name__ == '__main__':
    unittest.main()
