
def generate_email_html_v2(snapshot: dict) -> str:
    """
    V2 Email Generator:
    - Pure HTML Table logic
    - High Contrast (Black Texts)
    - No background colors
    - Explicit English Labels
    """
    try:
        rid = snapshot.get('reportId', 'N/A')
        rtype = snapshot.get('reportType', 'Inventory').replace('_', ' ').title()
        
        summary = snapshot.get('summary', {})
        total = summary.get('total', 0)
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: monospace; color: #000000; background-color: #ffffff;">
            <div style="border: 1px solid #000000; padding: 20px; max-width: 600px;">
                <h2 style="border-bottom: 2px solid #000000; padding-bottom: 10px; margin-top: 0;">
                    WORLD CLASS AVIATION V2
                </h2>
                
                <p><strong>REPORT ID:</strong> {rid}</p>
                <p><strong>TYPE:</strong> {rtype}</p>
                
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px; border: 1px solid #000000;">
                    <tr>
                        <th style="border: 1px solid #000000; padding: 8px; text-align: left;">METRIC</th>
                        <th style="border: 1px solid #000000; padding: 8px; text-align: right;">VALUE</th>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #000000; padding: 8px;">TOTAL ITEMS</td>
                        <td style="border: 1px solid #000000; padding: 8px; text-align: right;">{total}</td>
                    </tr>
                </table>
                
                <p style="margin-top: 20px; font-size: 12px;">
                    * The complete technical record is attached as a PDF.<br>
                    * This is an automated dispatch from the V2 Secure Pipeline.
                </p>
                
                <div style="border-top: 1px solid #000000; margin-top: 20px; padding-top: 10px; font-size: 10px; text-align: center;">
                    SECURE LOGISTICS TERMINAL | FAA/EASA COMPLIANT
                </div>
            </div>
        </body>
        </html>
        """
        return html
    except Exception as e:
        return f"<html><body><h1>System Error in Email Generation</h1><p>{str(e)}</p></body></html>"
