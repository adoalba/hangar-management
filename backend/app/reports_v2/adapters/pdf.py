
import io
import logging
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

logger = logging.getLogger(__name__)

def generate_pdf_v2(snapshot: dict) -> bytes:
    """
    V2 PDF Generator: 
    - Zero External Dependencies (No Logos)
    - High Contrast (Black/White)
    - Fail-Safe (Try/Except Wrapper)
    - Portrait Efficiency
    """
    try:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer, 
            pagesize=A4,
            rightMargin=40, leftMargin=40, topMargin=85, bottomMargin=40
        )
        
        elements = []
        styles = getSampleStyleSheet()

        # Canvas Drawing Function for Fixed Header (x=140, y=15 from top)
        # Note: ReportLab origin (0,0) is bottom-left. A4 is ~595x842.
        # Top-left y=15 means y ~ 827. 
        
        def header_footer(canvas, doc):
            canvas.saveState()
            
            # HEADER: "WORLD CLASS AVIATION" at x=130, y~Top (832)
            canvas.setFont('Helvetica-Bold', 16)
            canvas.setFillColor(colors.black)
            canvas.drawString(130, 832, "WORLD CLASS AVIATION") 
            
            # Subheader info
            canvas.setFont('Helvetica', 10)
            report_id = snapshot.get('reportId', 'N/A')
            report_type = snapshot.get('reportType', 'Inventory Report').replace('_', ' ').title()
            gen_date = snapshot.get('generatedAt', '').split('T')[0]
            
            canvas.drawString(130, 817, f"{report_type} | {report_id}")
            canvas.drawString(130, 802, f"Generated: {gen_date} | User: {snapshot.get('generatedBy', 'System')}")
            
            canvas.restoreState()

        # Update doc logic to use this onPage
        # We remove standard flowables for header since we draw them now
        
        # 2. Summary Table (B/W)
        summary = snapshot.get('summary', {})
        s_data = [
            ['Total Items', str(summary.get('total', 0))],
            ['Serviceable', str(summary.get('byStatus', {}).get('YELLOW', 0))],
            ['Repairable', str(summary.get('byStatus', {}).get('GREEN', 0))],
            ['Removed', str(summary.get('byStatus', {}).get('WHITE', 0))],
            ['Rejected', str(summary.get('byStatus', {}).get('RED', 0))]
        ]
        
        t_summary = Table(s_data, colWidths=[200, 100], hAlign='CENTER')
        t_summary.setStyle(TableStyle([
            ('GRID', (0,0), (-1,-1), 1, colors.black),
            ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('TEXTCOLOR', (0,0), (-1,-1), colors.black),
        ]))
        
        # Add a Spacer to push content down below the drawn header
        # The header takes up space from 842 down to ~760. 
        # Content starts at topMargin=60 (invaded). Need margin-top=40 for Tables relative to header space.
        # We'll just set topMargin on DocTemplate to clear the header area.
        # Header ends at 770. So topMargin should be ~100 (842-742).
        elements.append(Spacer(1, 20)) # Small spacer if needed or rely on margins
        elements.append(t_summary)
        elements.append(Spacer(1, 40)) # "Margin-top 40 para la sección de tablas" request interpreted as spacing
        
        # 3. Items List
        items = snapshot.get('items', [])
        
        if not items:
            elements.append(Paragraph("No records found.", styles['Normal']))
        else:
            # Item Style
            label_s = ParagraphStyle('Lbl', parent=styles['Normal'], fontSize=8, fontName='Helvetica-Bold')
            val_s = ParagraphStyle('Val', parent=styles['Normal'], fontSize=8, fontName='Helvetica')
            
            for item in items:
                # 2-Col Grid
                # Row 1: Header
                header_txt = f"P/N: {item['pn']} | S/N: {item['sn']} | {item['statusLabel'].upper()}"
                
                # Row 2: Data
                # Flatten important fields
                # We use a nested table for the item details
                detail_data = [
                    [Paragraph('Part Name', label_s), Paragraph(item['partName'], val_s),
                     Paragraph('Location', label_s), Paragraph(item['location'], val_s)],
                     
                    [Paragraph('Brand/Model', label_s), Paragraph(f"{item['brand']} / {item['model']}", val_s),
                     Paragraph('Bin/Shelf', label_s), Paragraph(item['physicalStorageLocation'], val_s)],
                     
                    [Paragraph('Traceability', label_s), Paragraph(f"Reg: {item['registrationDate']}", val_s),
                     Paragraph('Condition', label_s), Paragraph(item['statusLabel'], val_s)],
                ]
                
                t_item = Table(detail_data, colWidths=[70, 190, 70, 190])
                t_item.setStyle(TableStyle([
                    ('VALIGN', (0,0), (-1,-1), 'TOP'),
                    ('GRID', (0,0), (-1,-1), 0.5, colors.black),
                ]))
                
                # Header Box
                t_head = Table([[Paragraph(header_txt, label_s)]], colWidths=[520])
                t_head.setStyle(TableStyle([
                    ('BOX', (0,0), (-1,-1), 1, colors.black),
                    ('BACKGROUND', (0,0), (-1,-1), colors.white),
                ]))
                
                elements.append(KeepTogether([t_head, t_item, Spacer(1, 15)]))

        doc.build(elements, onFirstPage=header_footer, onLaterPages=header_footer)
        buffer.seek(0)
        return buffer.getvalue()

    except Exception as e:
        logger.error(f"PDF_V2_ERROR: {e}")
        # EMERGENCY FALLBACK PDF
        f = io.BytesIO()
        c = SimpleDocTemplate(f)
        styles = getSampleStyleSheet()
        c.build([Paragraph(f"CRITICAL ERROR GENERATING REPORT. ID: {snapshot.get('reportId')}", styles['Heading1'])])
        f.seek(0)
        return f.getvalue()
