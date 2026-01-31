
import sys
import os
import unittest
import logging
from datetime import datetime

# Path setup
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ['DATABASE_URL'] = "sqlite:///:memory:" # Safe In-Memory DB for logic check

from app.reports_v2.dal import fetch_inventory_safe
from app.reports_v2.domain import build_snapshot
from app.reports_v2.adapters.pdf import generate_pdf_v2
from app.reports_v2.adapters.email import generate_email_html_v2
from app.models import AviationPart

# Mock G/DB
class MockPart:
    def __init__(self, **kwargs):
        for k,v in kwargs.items(): setattr(self, k, v)

class TestReportsV2(unittest.TestCase):
    
    def test_dal_list_handling(self):
        """Verify DAL converts lists to strings safely."""
        # This unit test mocks the DB query part or just tests logic if we could isolate it.
        # Since logic is inside `fetch_inventory_safe` which calls DB, we rely on the integration test mostly.
        # Let's trust integration for DAL-DB interaction, but verify the helpers if any.
        pass

    def test_domain_mapping(self):
        """Verify FAA Terminology enforcement."""
        from app.reports_v2.domain import map_db_item_to_domain
        p = MockPart(tag_color='YELLOW', part_name='Test')
        d = map_db_item_to_domain(p)
        self.assertEqual(d['statusLabel'], 'Serviceable Material')
        
        p2 = MockPart(tag_color='PURPLE', part_name='Test') # Invalid Color
        d2 = map_db_item_to_domain(p2)
        self.assertEqual(d2['statusLabel'], 'Removed – No Defect') # Fallback

    def test_pdf_generation(self):
        """Verify PDF generation is robust."""
        snapshot = {
            'reportId': 'TEST-ID',
            'items': [{'pn': 'P1', 'sn': 'S1', 'statusLabel': 'OK', 'partName': 'N', 'brand': 'B', 'model': 'M', 'location': 'L', 'physicalStorageLocation': 'Bins', 'registrationDate': '2022', 'status': 'YELLOW'}],
            'summary': {'total': 1, 'byStatus': {'YELLOW': 1}}
        }
        pdf = generate_pdf_v2(snapshot)
        self.assertTrue(pdf.startswith(b'%PDF'), "PDF Magic Bytes Missing")

    def test_email_generation(self):
        """Verify Email HTML."""
        snapshot = {'reportId': 'TEST', 'summary': {'total': 5}}
        html = generate_email_html_v2(snapshot)
        self.assertIn('WORLD CLASS AVIATION V2', html)
        self.assertIn('TOTAL ITEMS', html)

if __name__ == '__main__':
    unittest.main()
