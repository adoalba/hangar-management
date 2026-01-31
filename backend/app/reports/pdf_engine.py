
import io
import logging
import base64
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape, portrait
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

from .shared import format_report_items, REPORT_BRANDING

logger = logging.getLogger(__name__)


def draw_report_header_footer(canvas, doc, report_id, report_type, generated_at):
    """Draw professional branding on every page."""
    canvas.saveState()
    
    try:
        # Define header boundary (Absolute positioning for strict alignment)
        page_width, page_height = landscape(A4)
        
        # 2. TITLE (True Center)
        company_name = REPORT_BRANDING.get('companyName', 'Aviation Report')
        subtitle = (report_type or 'Detailed Report').replace('_', ' ').title()
        
        # Black Ink Only
        canvas.setFont('Helvetica-Bold', 16)
        canvas.setFillColor(colors.black)
        canvas.drawCentredString(page_width / 2.0, page_height - 40, company_name)
        
        canvas.setFont('Helvetica', 10)
        canvas.setFillColor(colors.black) 
        canvas.drawCentredString(page_width / 2.0, page_height - 52, subtitle)

        # 3. METADATA (Right)
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(colors.black)
        canvas.drawRightString(page_width - doc.rightMargin, page_height - 35, f"Report ID: {report_id or 'N/A'}")
        canvas.drawRightString(page_width - doc.rightMargin, page_height - 45, f"Issued: {generated_at or 'N/A'}")
        canvas.drawRightString(page_width - doc.rightMargin, page_height - 55, f"Confidentiality: Privileged")
        
        # Header Separator (Black Line)
        canvas.setStrokeColor(colors.black) 
        canvas.setLineWidth(1)
        canvas.line(doc.leftMargin, page_height - 65, page_width - doc.rightMargin, page_height - 65)

        # 4. FOOTER
        footer_text = REPORT_BRANDING.get('footerText', 'CONFIDENTIAL')
        
        canvas.setStrokeColor(colors.black)
        canvas.setLineWidth(0.5)
        canvas.line(doc.leftMargin, 40, page_width - doc.rightMargin, 40)
        
        canvas.setFont('Helvetica-Bold', 7)
        canvas.setFillColor(colors.black)
        canvas.drawString(doc.leftMargin, 28, footer_text)
        
        canvas.setFont('Helvetica', 7)
        canvas.drawCentredString(page_width / 2.0, 28, f"CERTIFIED RECORD | PAGE {doc.page} | {generated_at}")
        canvas.drawRightString(page_width - doc.rightMargin, 28, f"World Class Aviation")
        
    except Exception as e:
        # FAIL-SAFE FALLBACK: Draw minimal header if advanced layout crashes
        logger.error(f"Header Layout Failure: {e}")
        try:
            page_width, page_height = landscape(A4)
            canvas.setFont('Helvetica-Bold', 12)
            canvas.setFillColor(colors.black)
            canvas.drawString(doc.leftMargin, page_height - 50, f"Report: {report_type}")
            canvas.setFont('Helvetica', 10)
            canvas.drawString(doc.leftMargin, page_height - 65, f"ID: {report_id}")
        except:
            # Absolute worst case: do nothing, just let data print
            pass

    canvas.restoreState()

def generate_pdf_report(report_data):
    """
    Enterprise-Grade PDF Generator (Portrait Mode).
    Features: Section 1 (Summary Table) + Section 2 (Detailed Vertical Blocks).
    Compliant with FAA/EASA Technical Record Standards.
    """
    try:
        buffer = io.BytesIO()
        # PORTRAIT A4 - Standard Aviation Format
        doc = SimpleDocTemplate(
            buffer, 
            pagesize=A4, 
            rightMargin=40, 
            leftMargin=40, 
            topMargin=60, 
            bottomMargin=40
        )
        
        elements = []
        report_type = report_data.get('reportType', 'Inventory Report')
        report_id = report_data.get('reportId', 'N/A')
        generated_at = report_data.get('generatedAt', datetime.utcnow().strftime('%Y-%m-%d %H:%M'))

        # Mandatory Formatter Usage
        formatted = format_report_items(report_data.get('items', []), report_type)
        all_columns = formatted['columns']
        rows = formatted['rows']
        
        styles = getSampleStyleSheet()
        title_style = styles['Heading2']
        title_style.alignment = 1 # Center
        section_style = ParagraphStyle('SectionHeader', parent=styles['Heading3'], spaceBefore=10, spaceAfter=10, fontSize=12, textColor=colors.black)
        
        # --- SECTION 1: INVENTORY IDENTIFICATION TABLE (SUMMARY) ---
        elements.append(Paragraph("SECTION 1: INVENTORY IDENTIFICATION", section_style))
        elements.append(Spacer(1, 5))
        
        # Filter Columns for Summary (Key Identification Data Only)
        summary_keys = ['statusLabel', 'pn', 'sn', 'partName', 'location', 'registrationDate']
        summary_cols = [col for col in all_columns if col['key'] in summary_keys]
        
        # Construct Summary Table Data
        summary_data = []
        summary_data.append([col['label'] for col in summary_cols])
        
        normal_style = styles['Normal']
        normal_style.fontSize = 8
        
        for row in rows:
            row_data = []
            for col in summary_cols:
                val = str(row.get(col['key'], '—'))
                # Truncate slightly for summary table to ensure fit
                if len(val) > 30 and col['key'] == 'partName':
                     val = val[:27] + "..."
                row_data.append(val)
            summary_data.append(row_data)

        if not rows:
            elements.append(Paragraph("<br/><br/><center><b>No records found.</b></center>", styles['Normal']))
        else:
            # Summary Table Styling (Clean, Professional, Black/White)
            # No Zebra, No Backgrounds.
            t_summary = Table(summary_data, repeatRows=1)
            t_summary.setStyle(TableStyle([
                # Header Styling (White BG, Black Text, Bottom Border)
                ('BACKGROUND', (0,0), (-1,0), colors.white),
                ('TEXTCOLOR', (0,0), (-1,0), colors.black),
                ('ALIGN', (0,0), (-1,-1), 'LEFT'),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('FONTSIZE', (0,0), (-1,0), 8),
                ('BOTTOMPADDING', (0,0), (-1,0), 6),
                ('LINEBELOW', (0,0), (-1,0), 1, colors.black), # Header Divider
                
                # Data Styling
                ('FONTSIZE', (0,1), (-1,-1), 7),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('GRID', (0,0), (-1,-1), 0.5, colors.black), # Grid is efficient enough
            ]))
            elements.append(t_summary)
            
        # --- PAGE BREAK BEFORE DETAILS ---
        elements.append(PageBreak())
        
        # --- SECTION 2: COMPONENT TECHNICAL RECORDS (DETAILS) ---
        # Ink Efficient Design: Blocks separated by whitespace, headers in boxes (not filled)
        
        elements.append(Paragraph("SECTION 2: COMPONENT TECHNICAL RECORDS", section_style))
        elements.append(Spacer(1, 15))
        
        # Styles for Detail Blocks
        header_bar_style = ParagraphStyle(
            'DetailHeader', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10, 
            textColor=colors.black, leading=14 # Black Text
        )
        label_style = ParagraphStyle(
            'Label', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=8, textColor=colors.black # Black Text
        )
        value_style = ParagraphStyle(
            'Value', parent=styles['Normal'], fontName='Helvetica', fontSize=8, textColor=colors.black # Black Text
        )

        for row in rows:
            # 1. Block Header (Bordered Box)
            pn = row.get('pn', '—')
            sn = row.get('sn', '—')
            status = row.get('statusLabel', '—').upper()
            header_text = f"P/N: {pn}  |  S/N: {sn}  |  {status}"
            
            # 2. Group Data Fields
            groups = [
                ("IDENTIFICATION", [
                    ('Part Number', row.get('pn')),
                    ('Serial Number', row.get('sn')),
                    ('Description', row.get('partName')),
                    ('Material Status', row.get('statusLabel')),
                ]),
                ("TECHNICAL DATA", [
                    ('Manufacturer / Brand', row.get('brand')),
                    ('Model', row.get('model')),
                    ('Location', row.get('location')), 
                    ('Bin/Shelf', row.get('physicalStorageLocation')),
                    ('TAT/T.T', row.get('tat')),
                    ('TSO', row.get('tso')),
                    ('Shelf Life', row.get('shelfLife')),
                    ('T.C.', row.get('tc')),
                    ('CSO', row.get('cso')),
                    ('C.REM', row.get('crem')),
                    ('T.REM', row.get('trem')), 
                ]),
                 ("TRACEABILITY & HISTORY", [
                    ('Registration Date', row.get('registrationDate')),
                    ('Removal Reason', row.get('removalReason')),
                    ('Rejection Reason', row.get('rejectionReason')),
                    ('Disposition', row.get('finalDisposition')),
                    ('Observations', row.get('observations')),
                ]),
                ("ADMINISTRATIVE", [
                    ('Organization', row.get('organization')),
                    ('Tech Name', row.get('technician_name')),
                    ('Insp. Name', row.get('inspector_name')),
                    ('System ID', row.get('id')),
                ])
            ]
            
            # Build Grid Rows
            grid_data = []
            
            for group_name, fields in groups:
                 # Group Header
                grid_data.append([Paragraph(f"<b>{group_name}</b>", label_style), '', '', ''])
                
                # Fields
                for i in range(0, len(fields), 2):
                    f1 = fields[i]
                    f2 = fields[i+1] if i+1 < len(fields) else (None, None)
                    
                    k1, v1 = f1[0], str(f1[1] if f1[1] is not None else '—')
                    k2, v2 = (f2[0], str(f2[1] if f2[1] is not None else '—')) if f2[0] else ('', '')
                    
                    grid_data.append([
                        Paragraph(k1, label_style), Paragraph(v1, value_style),
                        Paragraph(k2, label_style) if k2 else '', Paragraph(v2, value_style) if k2 else ''
                    ])

            # Create Table
            t_detail = Table(grid_data, colWidths=[90, 160, 90, 160])
            t_detail.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('LINEBELOW', (0,0), (-1,-1), 0.25, colors.black), # Thin black lines
                ('SPAN', (0,0), (-1,0), 0) if False else ('SPAN', (0,0), (-1,0)), 
            ]))
            
            # Apply spans for group headers
            row_idx = 0
            styles_list = [
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('GRID', (0,0), (-1,-1), 0.25, colors.black), # Grid
            ]
            
            for group_name, fields in groups:
                 # The group header row - NO BACKGROUND
                styles_list.append(('SPAN', (0, row_idx), (-1, row_idx))) 
                styles_list.append(('BOTTOMPADDING', (0, row_idx), (-1, row_idx), 2))
                # Add thicker line under group header
                styles_list.append(('LINEBELOW', (0, row_idx), (-1, row_idx), 1, colors.black))
                row_idx += 1
                
                # Calculate data rows
                data_rows = (len(fields) + 1) // 2
                row_idx += data_rows
            
            t_detail.setStyle(TableStyle(styles_list))

            # Header Bar Table - WHITE BG, BLACK BORDER
            t_header = Table([[Paragraph(header_text, header_bar_style)]], colWidths=[500])
            t_header.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), colors.white),
                ('BOX', (0,0), (-1,-1), 1, colors.black), # Black Border box
                ('LEFTPADDING', (0,0), (-1,-1), 10),
                ('TOPPADDING', (0,0), (-1,-1), 6),
                ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ]))

            # Block Container
            block = KeepTogether([
                t_header,
                t_detail,
                Spacer(1, 30), # Increased white space
            ])
            elements.append(block)

        # Build with Header/Footer callback
        doc.build(elements, 
                  onFirstPage=lambda c, d: draw_report_header_footer(c, d, report_id, report_type, generated_at),
                  onLaterPages=lambda c, d: draw_report_header_footer(c, d, report_id, report_type, generated_at))
        
        buffer.seek(0)
        return buffer
    except Exception as e:
        logger.error(f"CRITICAL: PDF Generation Failure for {report_data.get('reportId')}: {e}")
        from ..utils.normalization import send_critical_alert
        send_critical_alert(f"PDF Generation Failure", f"Error building PDF document for report {report_data.get('reportId')}", report_id=report_data.get('reportId'), error=e)
        
        # Emergency PDF
        error_buffer = io.BytesIO()
        c = canvas.Canvas(error_buffer, pagesize=A4)
        c.drawString(100, 750, "CRITICAL ERROR: Failed to generate report PDF.")
        c.drawString(100, 730, f"Report ID: {report_data.get('reportId', 'N/A')}")
        c.save()
        error_buffer.seek(0)
        return error_buffer
    except Exception as e:
        logger.error(f"CRITICAL: PDF Generation Failure for {report_data.get('reportId')}: {e}")
        from ..utils.normalization import send_critical_alert
        send_critical_alert(f"PDF Generation Failure", f"Error building PDF document for report {report_data.get('reportId')}", report_id=report_data.get('reportId'), error=e)
        
        # Return simple error PDF if possible or raise
        error_buffer = io.BytesIO()
        c = canvas.Canvas(error_buffer, pagesize=A4)
        c.drawString(100, 750, "CRITICAL ERROR: Failed to generate report PDF.")
        c.drawString(100, 730, f"Report ID: {report_data.get('reportId', 'N/A')}")
        c.drawString(100, 710, "The system administrator has been notified.")
        c.save()
        error_buffer.seek(0)
        return error_buffer
