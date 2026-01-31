
import logging
from datetime import datetime
from .shared import STATUS_DISPLAY_MAP

logger = logging.getLogger(__name__)

# --- EMAIL DISPATCH ---

STATUS_DISPLAY_MAP = {
    'YELLOW': 'Serviceable Material',
    'GREEN': 'Repairable Material',
    'WHITE': 'Removed – No Defect',
    'RED': 'Rejected Material'
}

def generate_report_email_html(report_data):
    """
    Generate simplified HTML email body for aviation compliance.
    Summary only, no technical tables in body.
    """
    report_type = report_data.get('reportType', 'Inventory Report')
    report_id = report_data.get('reportId', 'N/A')
    summary = report_data.get('summary', {})
    
    return f'''
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
    </head>
    <body style="font-family: sans-serif; color: #000000; line-height: 1.5; background-color: #ffffff; padding: 20px 0;">
        <div style="max-width: 600px; margin: 0 auto; border: 1px solid #000000; background-color: #ffffff; padding: 40px; box-sizing: border-box;">
            <div style="border-bottom: 2px solid #000000; padding-bottom: 20px; margin-bottom: 24px; text-align: center;">
                <h1 style="color: #000000; margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 2px; font-weight: 900;">WORLD CLASS AVIATION</h1>
                <p style="margin: 8px 0 0 0; color: #000000; font-size: 12px; font-weight: bold; text-transform: uppercase;">Aviation Technical Record</p>
            </div>

            <p style="font-size: 14px; color: #000000;">This email contains an attached <strong>FAA/EASA-compliant</strong> technical inventory report in PDF format.</p>
            
            <div style="border: 1px solid #000000; padding: 20px; margin: 24px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="color: #000000; font-size: 11px; text-transform: uppercase; padding-bottom: 8px; width: 40%; font-weight: bold;">Report ID</td>
                        <td style="color: #000000; font-size: 14px; font-weight: bold; padding-bottom: 8px; font-family: monospace;">{report_id}</td>
                    </tr>
                    <tr>
                        <td style="color: #000000; font-size: 11px; text-transform: uppercase; padding-bottom: 8px; font-weight: bold;">Report Type</td>
                        <td style="color: #000000; font-size: 14px; font-weight: bold; padding-bottom: 8px;">{report_type.replace('_', ' ').title()}</td>
                    </tr>
                    <tr>
                        <td style="color: #000000; font-size: 11px; text-transform: uppercase; font-weight: bold;">Total Units</td>
                        <td style="color: #000000; font-size: 14px; font-weight: bold;">{summary.get('total', 0)}</td>
                    </tr>
                </table>
            </div>
            
            <p style="font-size: 12px; color: #000000; font-style: italic; margin-top: 32px;">
                Note: This is an automated dispatch. All technical details are contained within the attached official document.
            </p>

            <div style="border-top: 1px solid #000000; margin-top: 32px; padding-top: 16px;">
                <p style="margin: 0; font-size: 10px; color: #000000; text-align: center; font-weight: bold;">WORLD CLASS AVIATION - LOGISTICS TERMINAL SECURE LAYER</p>
            </div>
        </div>
    </body>
    </html>
    '''

def generate_approval_email_html(report_data, approval_token, base_url):
    """
    Generate styled HTML email with ACKNOWLEDGE & SIGN RECEIPT button.
    Follows World Class Aviation industrial design.
    """
    report_type_labels = {
        'TOTAL_INVENTORY': 'Total Inventory',
        'BY_STATUS': 'By Card Type',
        'BY_LOCATION': 'By Location',
        'BY_PART_NUMBER': 'By Part Number'
    }
    
    report_type = report_data.get('reportType', 'UNKNOWN')
    summary = report_data.get('summary', {})
    filters = report_data.get('filtersApplied', {})
    
    # Build filters list
    filters_html = ''
    if filters:
        filters_list = ''.join([
            f'<tr><td style="padding: 4px 8px; font-size: 11px; color: #64748b;">{k}</td>'
            f'<td style="padding: 4px 8px; font-size: 11px; color: #1e293b; font-weight: bold;">{v}</td></tr>'
            for k, v in filters.items()
        ])
        filters_html = f'''
        <table cellpadding="0" cellspacing="0" style="width: 100%; margin-top: 12px;">
            <tr><td colspan="2" style="font-size: 10px; color: #94a3b8; text-transform: uppercase; padding-bottom: 4px;">Applied Filters</td></tr>
            {filters_list}
        </table>
        '''
    
    # Status breakdown with color indicators
    by_status = summary.get('byStatus', {})
    status_colors = {
        'YELLOW': '#eab308',
        'GREEN': '#10b981',
        'WHITE': '#64748b',
        'RED': '#f43f5e'
    }
    status_html = ''.join([
        f'''<td style="padding: 8px; text-align: center;">
            <div style="width: 12px; height: 12px; background-color: {status_colors.get(status, '#6366f1')}; 
                        border-radius: 2px; margin: 0 auto 4px auto;"></div>
            <div style="font-size: 18px; font-weight: 900; color: #0f172a;">{count}</div>
            <div style="font-size: 9px; color: #94a3b8; text-transform: uppercase;">{STATUS_DISPLAY_MAP.get(status, status)}</div>
        </td>'''
        for status, count in by_status.items()
    ])
    
    # Approval button URL
    approval_url = f"{base_url}/api/reports/acknowledge/{approval_token}"
    
    html = f'''
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
        <table cellpadding="0" cellspacing="0" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            
            <!-- HEADER: Branded Gold block -->
            <tr>
                <td style="background-color: #b8860b; padding: 24px 32px;">
                    <table cellpadding="0" cellspacing="0" style="width: 100%;">
                        <tr>
                            <td>
                                <h1 style="margin: 0; color: #ffffff; font-size: 14px; font-weight: 900; 
                                           text-transform: uppercase; letter-spacing: 2px;">
                                    Aviation Technical Record
                                </h1>
                                <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">
                                    Report Dispatch - Approval Required
                                </p>
                            </td>
                            <td style="text-align: right;">
                                <div style="background-color: #8c6609; padding: 8px 16px; border-radius: 4px;">
                                    <span style="color: #ffffff; font-size: 12px; font-weight: 900;">
                                        WORLD CLASS AVIATION
                                    </span>
                                </div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            
            <!-- REPORT INFO -->
            <tr>
                <td style="padding: 24px 32px; border-bottom: 1px solid #e2e8f0;">
                    <table cellpadding="0" cellspacing="0" style="width: 100%;">
                        <tr>
                            <td style="vertical-align: top; width: 50%;">
                                <p style="margin: 0; font-size: 10px; color: #94a3b8; text-transform: uppercase;">Report ID</p>
                                <p style="margin: 4px 0; font-size: 16px; font-weight: 900; color: #4f46e5; font-family: monospace;">
                                    {report_data.get('reportId', 'N/A')}
                                </p>
                            </td>
                            <td style="vertical-align: top; width: 50%; text-align: right;">
                                <p style="margin: 0; font-size: 10px; color: #94a3b8; text-transform: uppercase;">Generated</p>
                                <p style="margin: 4px 0; font-size: 12px; color: #1e293b; font-weight: bold;">
                                    {report_data.get('generatedAt', 'N/A')}
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            
            <!-- SUMMARY TABLE -->
            <tr>
                <td style="padding: 24px 32px;">
                    <table cellpadding="0" cellspacing="0" style="width: 100%; border: 2px solid #0f172a;">
                        <tr>
                            <td colspan="2" style="background-color: #0f172a; padding: 12px 16px;">
                                <span style="color: #ffffff; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">
                                    Report Summary / Resumen del Reporte
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 16px; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; width: 40%;">
                                <span style="font-size: 10px; color: #64748b; text-transform: uppercase;">Report Type / Tipo</span>
                            </td>
                            <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">
                                <span style="font-size: 13px; color: #0f172a; font-weight: 900;">
                                    {report_type_labels.get(report_type, report_type)}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 16px; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                                <span style="font-size: 10px; color: #64748b; text-transform: uppercase;">Item Count / Total Items</span>
                            </td>
                            <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">
                                <span style="font-size: 24px; color: #0f172a; font-weight: 900;">{summary.get('total', 0)}</span>
                                <span style="font-size: 11px; color: #94a3b8; margin-left: 8px;">units</span>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 16px; background-color: #f8fafc;">
                                <span style="font-size: 10px; color: #64748b; text-transform: uppercase;">Generated By / Por</span>
                            </td>
                            <td style="padding: 12px 16px;">
                                <span style="font-size: 13px; color: #0f172a; font-weight: bold;">
                                    {report_data.get('generatedBy', 'System')}
                                </span>
                            </td>
                        </tr>
                    </table>
                    
                    {filters_html}
                </td>
            </tr>
            
            <!-- STATUS BREAKDOWN -->
            <tr>
                <td style="padding: 0 32px 24px 32px;">
                    <table cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f8fafc; border: 1px solid #e2e8f0;">
                        <tr>
                            <td colspan="4" style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">
                                <span style="font-size: 10px; color: #64748b; text-transform: uppercase;">Status Breakdown</span>
                            </td>
                        </tr>
                        <tr>
                            {status_html}
                        </tr>
                    </table>
                </td>
            </tr>
            
            <!-- ACKNOWLEDGE BUTTON -->
            <tr>
                <td style="padding: 16px 32px 32px 32px;">
                    <table cellpadding="0" cellspacing="0" style="width: 100%;">
                        <tr>
                            <td align="center">
                                <a href="{approval_url}" 
                                   style="display: inline-block; padding: 20px 48px; 
                                          background-color: #eab308; color: #0f172a; 
                                          font-size: 14px; font-weight: 900; text-transform: uppercase;
                                          text-decoration: none; letter-spacing: 1px;
                                          border: 3px solid #10b981; border-radius: 8px;
                                          box-shadow: 0 4px 12px rgba(234, 179, 8, 0.4);">
                                    ✓ ACKNOWLEDGE &amp; SIGN RECEIPT
                                </a>
                            </td>
                        </tr>
                        <tr>
                            <td align="center" style="padding-top: 12px;">
                                <p style="margin: 0; font-size: 10px; color: #94a3b8;">
                                    Click button above to confirm receipt of this report.
                                    This action will be recorded in the Aircraft Maintenance Log.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            
            <!-- FOOTER -->
            <tr>
                <td style="padding: 24px 32px; background-color: #0f172a;">
                    <table cellpadding="0" cellspacing="0" style="width: 100%;">
                        <tr>
                            <td>
                                <p style="margin: 0; color: #64748b; font-size: 10px;">
                                    This is an automated message from the Aviation Inventory System.
                                </p>
                                <p style="margin: 4px 0 0 0; color: #475569; font-size: 10px;">
                                    World Class Aviation - Logistics Terminal Secure Layer
                                </p>
                            </td>
                            <td style="text-align: right;">
                                <p style="margin: 0; color: #94a3b8; font-size: 9px; font-family: monospace;">
                                    VER 7.0.0-APPROVAL
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            
        </table>
    </body>
    </html>
    '''
    
    return html


def generate_acknowledgment_page_html(report_data, acknowledged_by):
    """
    Generate HTML landing page for successful report acknowledgment.
    Industrial World Class Aviation styling.
    """
    return f'''
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Report Acknowledgment - World Class Aviation</title>
        <style>
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            body {{ 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }}
            .container {{
                background: white;
                border-radius: 24px;
                max-width: 500px;
                width: 100%;
                overflow: hidden;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            }}
            .header {{
                background: #0f172a;
                padding: 24px 32px;
                text-align: center;
            }}
            .header h1 {{
                color: white;
                font-size: 14px;
                font-weight: 900;
                text-transform: uppercase;
                letter-spacing: 2px;
                margin-bottom: 4px;
            }}
            .header p {{
                color: #94a3b8;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }}
            .success-icon {{
                display: flex;
                justify-content: center;
                padding: 40px 32px 24px;
            }}
            .checkmark {{
                width: 100px;
                height: 100px;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 10px 40px rgba(16, 185, 129, 0.4);
                animation: pulse 2s infinite;
            }}
            @keyframes pulse {{
                0%, 100% {{ transform: scale(1); }}
                50% {{ transform: scale(1.05); }}
            }}
            .checkmark svg {{
                width: 50px;
                height: 50px;
                fill: white;
            }}
            .content {{
                padding: 0 32px 32px;
                text-align: center;
            }}
            .title {{
                font-size: 20px;
                font-weight: 900;
                color: #0f172a;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 16px;
            }}
            .message {{
                font-size: 13px;
                color: #64748b;
                line-height: 1.6;
                margin-bottom: 24px;
            }}
            .details {{
                background: #f8fafc;
                border: 2px solid #e2e8f0;
                border-radius: 12px;
                padding: 16px;
                text-align: left;
            }}
            .detail-row {{
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #e2e8f0;
            }}
            .detail-row:last-child {{
                border-bottom: none;
            }}
            .detail-label {{
                font-size: 10px;
                color: #94a3b8;
                text-transform: uppercase;
                font-weight: bold;
            }}
            .detail-value {{
                font-size: 12px;
                color: #0f172a;
                font-weight: bold;
                font-family: monospace;
            }}
            .footer {{
                background: #0f172a;
                padding: 16px 32px;
                text-align: center;
            }}
            .footer p {{
                color: #64748b;
                font-size: 10px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Report Acknowledgment Successful</h1>
                <p>World Class Aviation • Aircraft Maintenance Log</p>
            </div>
            
            <div class="success-icon">
                <div class="checkmark">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                    </svg>
                </div>
            </div>
            
            <div class="content">
                <h2 class="title">Acknowledgment Recorded</h2>
                <p class="message">
                    Your acknowledgment has been recorded in the Aircraft Maintenance Log.
                    This confirmation is permanent and cannot be modified.
                </p>
                
                <div class="details">
                    <div class="detail-row">
                        <span class="detail-label">Report ID</span>
                        <span class="detail-value">{report_data.get('reportId', 'N/A')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Report Type</span>
                        <span class="detail-value">{report_data.get('reportType', 'N/A')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Generated</span>
                        <span class="detail-value">{report_data.get('generatedAt', 'N/A')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Acknowledged By</span>
                        <span class="detail-value">{acknowledged_by}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Timestamp</span>
                        <span class="detail-value">{datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}</span>
                    </div>
                </div>
            </div>
            
            <div class="footer">
                <p>This record is now read-only for compliance purposes.</p>
            </div>
        </div>
    </body>
    </html>
    '''
