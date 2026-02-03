import io
import logging
from xhtml2pdf import pisa

logger = logging.getLogger(__name__)

def generate_pdf_v2(snapshot: dict) -> bytes:
    """
    V2 PDF Generator: HTML/CSS to PDF via xhtml2pdf.
    Implements 'Card/Ficha' design for Aviation Reports.
    """
    try:
        # 1. Prepare Data
        items = snapshot.get('data', []) # Access 'data' directly from payload or defaults
        if not items:
            # Fallback if snapshot structure differs (e.g. from DB fetch)
            items = snapshot.get('items', [])

        # Metadata
        meta = {
            'company': snapshot.get('companyName', 'WORLD CLASS AVIATION'),
            'title': snapshot.get('reportTitle', 'AVIATION REPORT'),
            'tech': snapshot.get('technician', 'N/A'),
            'sup': snapshot.get('supervisor', 'N/A'),
            'date': snapshot.get('generatedAt', 'N/A'),
            'total_qty': snapshot.get('grandTotalQty', 0),
            'total_items': snapshot.get('totalItems', len(items))
        }

        # 2. HTML Template
        html_template = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                @page {{
                    size: A4 portrait;
                    margin: 1cm;
                    @top-center {{
                        content: "{meta['company']}";
                        font-family: Helvetica, sans-serif;
                        font-weight: bold;
                        font-size: 16px;
                    }}
                    @bottom-center {{
                        content: "Page " counter(page) " of " counter(pages);
                        font-family: Helvetica, sans-serif;
                        font-size: 10px;
                    }}
                }}
                body {{
                    font-family: Helvetica, sans-serif;
                    font-size: 12px;
                    color: #000;
                }}
                .header-info {{
                    width: 100%;
                    border-bottom: 2px solid #000;
                    margin-bottom: 20px;
                    padding-bottom: 10px;
                }}
                .header-row {{
                    display: flex; /* xhtml2pdf support for flex is limited, using table for layout safety */
                    width: 100%;
                }}
                table.header-table {{
                    width: 100%;
                    margin-bottom: 10px;
                }}
                table.header-table td {{
                    padding: 2px;
                }}
                
                /* CARD DESIGN */
                .card {{
                    border: 1px solid #000;
                    padding: 10px;
                    margin-bottom: 10px;
                    page-break-inside: avoid;
                    background-color: #fff;
                }}
                
                .card-header {{
                    background-color: #f0f0f0;
                    border-bottom: 1px solid #000;
                    padding: 5px;
                    font-weight: bold;
                    margin: -10px -10px 10px -10px; /* Bleed to edge */
                }}

                /* Grid Layout via Table */
                table.card-grid {{
                    width: 100%;
                    border-collapse: collapse;
                }}
                table.card-grid td {{
                    padding: 4px;
                    vertical-align: top;
                    width: 25%;
                }}
                
                .label {{
                    color: #666;
                    text-transform: uppercase;
                    font-size: 8px;
                    display: block;
                    margin-bottom: 2px;
                }}
                .value {{
                    font-weight: bold;
                    color: #000;
                    font-size: 10px;
                    word-wrap: break-word; /* Ensure long text wraps */
                }}

                .status-badge {{
                    padding: 2px 6px;
                    border: 1px solid #000;
                    border-radius: 4px;
                    font-size: 9px;
                    text-align: center;
                    display: inline-block;
                }}

                .summary-box {{
                    background: #eee;
                    border: 2px solid #000;
                    padding: 15px;
                    margin-top: 30px;
                    text-align: right;
                    font-weight: bold;
                    page-break-inside: avoid;
                }}
            </style>
        </head>
        <body>
            <!-- HEADER -->
            <div class="header-info">
                <table class="header-table">
                    <tr>
                        <td width="50%">
                            <div class="label">REPORT TITLE</div>
                            <div class="value" style="font-size: 14px;">{meta['title']}</div>
                        </td>
                        <td width="25%">
                            <div class="label">GENERATED AT</div>
                            <div class="value">{meta['date']}</div>
                        </td>
                        <td width="25%" style="text-align: right;">
                             <div class="label">COMPANY</div>
                             <div class="value">{meta['company']}</div>
                        </td>
                    </tr>
                     <tr>
                        <td>
                            <div class="label">TECHNICIAN</div>
                            <div class="value">{meta['tech']}</div>
                        </td>
                        <td>
                             <div class="label">SUPERVISOR</div>
                             <div class="value">{meta['sup']}</div>
                        </td>
                        <td></td>
                    </tr>
                </table>
            </div>

            <!-- ITEMS LOOP -->
            {''.join([f'''
            <div class="card">
                <div class="card-header">
                    P/N: {item.get('pn','N/A')} <span style="float:right;">QTY: {item.get('qty',1)}</span>
                </div>
                <table class="card-grid">
                    <tr>
                        <td>
                            <span class="label">DESCRIPTION</span>
                            <span class="value">{item.get('desc','N/A')}</span>
                        </td>
                        <td>
                             <span class="label">SERIAL NUMBER</span>
                             <span class="value">{item.get('sn','N/A')}</span>
                        </td>
                         <td>
                             <span class="label">CONDITION</span>
                             <div class="value">{item.get('cond','N/A').upper()}</div>
                        </td>
                         <td>
                             <span class="label">LOCATION</span>
                             <span class="value">{item.get('loc','N/A')}</span>
                        </td>
                    </tr>
                    <tr>
                        <td>
                             <span class="label">TRACEABILITY</span>
                             <span class="value">{item.get('trace','N/A')}</span>
                        </td>
                        <td>
                             <span class="label">ORIGIN / SOURCE</span>
                             <span class="value">{item.get('source','N/A')}</span>
                        </td>
                        <td>
                             <span class="label">TAG DATE</span>
                             <span class="value">{item.get('tag','N/A')}</span>
                        </td>
                        <td>
                             <span class="label">SHELF LIFE</span>
                             <span class="value">{item.get('shelf_life','N/A')}</span>
                        </td>
                    </tr>
                </table>
            </div>
            ''' for item in items])}

            <!-- SUMMARY BOX -->
            <div class="summary-box">
                <div style="font-size: 14px;">TOTAL ITEMS: {meta['total_items']}</div>
                <div style="font-size: 18px; margin-top: 5px;">GRAND TOTAL QTY: {meta['total_qty']}</div>
            </div>

        </body>
        </html>
        """

        # 3. Generate PDF
        buffer = io.BytesIO()
        pisa_status = pisa.CreatePDF(
            src=html_template,
            dest=buffer
        )

        if pisa_status.err:
            logger.error(f"PDF Generation Error: {pisa_status.err}")
            raise Exception("PDF Generation Failed")

        buffer.seek(0)
        return buffer.getvalue()

    except Exception as e:
        logger.error(f"PDF_V2_ERROR: {e}")
        # Return error PDF
        buffer = io.BytesIO()
        pisa.CreatePDF(
            src=f"<html><body><h1>Error generating report</h1><p>{str(e)}</p></body></html>",
            dest=buffer
        )
        buffer.seek(0)
        return buffer.getvalue()
