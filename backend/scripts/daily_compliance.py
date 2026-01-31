
import sys
import os
import logging
from datetime import datetime, timedelta
import uuid

# ReportLab imports
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../../'))

from backend.app.models import SessionLocal, ReportSnapshot, ComplianceLog, AviationPart
from backend.app.utils.normalization import validate_snapshot_schema

# Configure Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("DailyCompliance")

def generate_daily_report():
    """
    Generate a PDF Compliance Report for the last 24 hours.
    """
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        yesterday = now - timedelta(days=1)
        
        logger.info("Gathering Daily Compliance Metrics...")
        
        # 1. METRICS COLLECTION
        total_inventory = db.query(AviationPart).count()
        total_snapshots = db.query(ReportSnapshot).count()
        new_snapshots_24h = db.query(ReportSnapshot).filter(ReportSnapshot.created_at >= yesterday).count()
        
        # Logged Events
        warnings_24h = db.query(ComplianceLog).filter(
            ComplianceLog.timestamp >= yesterday, 
            ComplianceLog.severity == 'WARNING'
        ).count()
        
        critical_24h = db.query(ComplianceLog).filter(
            ComplianceLog.timestamp >= yesterday, 
            ComplianceLog.severity == 'CRITICAL'
        ).count()
        
        # Snapshot Health Check (Sample check or rely on recent logs)
        # We can trust the reconcile script logs for this.
        
        # 2. GENERATE PDF
        filename = f"daily_compliance_{now.strftime('%Y%m%d')}.pdf"
        doc = SimpleDocTemplate(filename, pagesize=A4)
        elements = []
        styles = getSampleStyleSheet()
        
        # Title
        title_style = ParagraphStyle('Title', parent=styles['Heading1'], alignment=1, spaceAfter=20)
        elements.append(Paragraph(f"SRE Daily Compliance Report", title_style))
        elements.append(Paragraph(f"Date: {now.strftime('%Y-%m-%d')}", styles['Normal']))
        elements.append(Spacer(1, 20))
        
        # Executive Summary Table
        elements.append(Paragraph("Executive Summary", styles['Heading2']))
        data = [
            ['Metric', 'Value'],
            ['Total Inventory Items', str(total_inventory)],
            ['Total Reports (Snapshots)', str(total_snapshots)],
            ['New Reports (24h)', str(new_snapshots_24h)],
            ['System Warnings (24h)', str(warnings_24h)],
            ['Critical Failures (24h)', str(critical_24h)],
        ]
        t = Table(data, colWidths=[200, 100])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 20))
        
        # Status
        status_text = "SYSTEM STABLE"
        status_color = colors.green
        if critical_24h > 0:
            status_text = "CRITICAL ISSUES DETECTED"
            status_color = colors.red
        elif warnings_24h > 0:
            status_text = "WARNINGS DETECTED"
            status_color = colors.orange
            
        elements.append(Paragraph(f"Overall Status: <font color='{status_color}'>{status_text}</font>", styles['Heading2']))
        
        # Build
        doc.build(elements)
        logger.info(f"Report generated: {filename}")
        
        # 3. LOG COMPLETION
        db.add(ComplianceLog(
            id=str(uuid.uuid4()),
            timestamp=datetime.utcnow(),
            event_type='DAILY_REPORT_GEN',
            severity='INFO',
            component='DailyComplianceScript',
            details={'filename': filename, 'status': status_text},
            user_id='SYSTEM_SRE'
        ))
        db.commit()

    except Exception as e:
        logger.error(f"Failed to generate report: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    generate_daily_report()
