/**
 * ComponentTemplate.ts
 * Master Template SSoT - Single Source of Truth for component rendering.
 * Generates identical HTML structure for Web, Print, and Email.
 */

import { AviationPart, TagColor } from '../types';
import { generateQRDataUri } from './QRGenerator';

export interface RenderOptions {
    mode: 'web' | 'print' | 'email';
    includeQR?: boolean;
    baseUrl?: string; // For QR code URL generation
}

// Color mappings
const TAG_COLORS: Record<TagColor, { hex: string; name: string }> = {
    [TagColor.YELLOW]: { hex: '#eab308', name: 'SERVICEABLE MATERIAL / MATERIAL APROBADO' },
    [TagColor.GREEN]: { hex: '#10b981', name: 'REPAIRABLE MATERIAL / MATERIAL REPARABLE' },
    [TagColor.WHITE]: { hex: '#cbd5e1', name: 'REMOVED NO DEFECT / REMOVIDO SIN FALLA' },
    [TagColor.RED]: { hex: '#f43f5e', name: 'REJECTED MATERIAL / MATERIAL RECHAZADO' },
};

const CERTIFICATION_TEXT: Record<TagColor, string> = {
    [TagColor.YELLOW]: 'WORLD CLASS AVIATION CERTIFIES that this component/material meets the requirements of applicable manuals and current reference documents. Approved for use as SERVICEABLE MATERIAL. / CERTIFICA que este componente / material cumple con los requisitos de los manuales aplicables y documentos de referencia vigentes.',
    [TagColor.GREEN]: 'WORLD CLASS AVIATION CERTIFIES that this component/material meets internal manuals and reference document requirements. / CERTIFICA que este componente / material cumple con los requisitos de manuales internos y documentos de referencia.',
    [TagColor.WHITE]: 'REMOVED FOR DESCRIBED REASON AND MEETS CURRENT REQUIREMENTS. / REMOVIDO POR LA RAZÓN DESCRITA Y CUMPLE CON REQUISITOS VIGENTES.',
    [TagColor.RED]: 'DOES NOT MEET APPLICABLE REQUIREMENTS. REJECTED FOR USE. / NO CUMPLE REQUISITOS APLICABLES. RECHAZADO PARA USO.',
};

// Helper: Section Header
const sectionHeader = (title: string): string => `
  <tr>
    <td colspan="12" style="background-color: #0f172a; color: white; padding: 4px 8px; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; font-family: Arial, sans-serif;">
      ${title}
    </td>
  </tr>
`;

// Helper: Field with label/value
const field = (label: string, value: string, colspan: number = 6, labelWidth: string = '33%'): string => `
  <td colspan="${colspan}" style="border: 1px solid black; padding: 0;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
      <tr>
        <td width="${labelWidth}" style="background-color: #f9fafb; border-right: 1px solid black; padding: 4px; font-size: 8px; font-weight: bold; text-transform: uppercase; color: #64748b; font-family: Arial, sans-serif;">
          ${label}
        </td>
        <td style="padding: 4px; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #0f172a; font-family: Arial, sans-serif; background-color: white;">
          ${value || ''}
        </td>
      </tr>
    </table>
  </td>
`;

// Helper: Times & Cycles Box
const timesCycleBox = (label: string, value: string): string => `
  <td style="border: 1px solid black; padding: 0;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
      <tr>
        <td style="background-color: #f3f4f6; border-bottom: 1px solid black; padding: 2px; text-align: center; font-size: 8px; font-weight: bold; text-transform: uppercase; color: #64748b; font-family: Arial, sans-serif;">
          ${label}
        </td>
      </tr>
      <tr>
        <td style="padding: 8px; text-align: center; font-size: 14px; font-weight: 900; font-family: 'Courier New', monospace; color: #0f172a; background-color: white; min-height: 42px;">
          ${value || '---'}
        </td>
      </tr>
    </table>
  </td>
`;

// Helper: Checkbox Field
const checkboxField = (label: string, checked: boolean): string => `
  <td style="border-right: 1px solid black; padding: 4px; text-align: center;">
    <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
      <tr>
        <td style="width: 12px; height: 12px; border: 1px solid black; background-color: white; text-align: center; vertical-align: middle;">
          ${checked ? '<div style="width: 6px; height: 6px; background-color: black; margin: 2px;"></div>' : ''}
        </td>
        <td style="padding-left: 6px; font-size: 9px; font-weight: bold; text-transform: uppercase; color: #1e293b; font-family: Arial, sans-serif;">
          ${label}
        </td>
      </tr>
    </table>
  </td>
`;

/**
 * Main Template Renderer
 */
export function renderComponentTemplate(part: AviationPart, options: RenderOptions): string {
    const { mode, includeQR = false, baseUrl = '' } = options;
    const tagInfo = TAG_COLORS[part.tagColor] || TAG_COLORS[TagColor.YELLOW];
    const certText = CERTIFICATION_TEXT[part.tagColor] || '';

    // Format dates
    const shelfLifeDate = part.shelfLife
        ? new Date(part.shelfLife).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : 'N/A';
    const regDate = part.registrationDate
        ? new Date(part.registrationDate).toLocaleDateString('en-US')
        : '';

    // Build Section 04 (Dynamic by Card Type)
    let section04Content = '';
    if (part.tagColor === TagColor.YELLOW) {
        section04Content = `<tr>${field('SHELF LIFE / FECHA VENC.', `<span style="color: #f43f5e; font-weight: 900;">${shelfLifeDate}</span>`, 12, '25%')}</tr>`;
    } else if (part.tagColor === TagColor.GREEN || part.tagColor === TagColor.WHITE) {
        const isGreen = part.tagColor === TagColor.GREEN;
        section04Content = `
      <tr>
        <td colspan="12" style="border: 1px solid black; padding: 0;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
            <tr>
              <td width="25%" style="background-color: #f9fafb; border-right: 1px solid black; padding: 4px; text-align: center; font-size: 8px; font-weight: bold; text-transform: uppercase; color: #64748b; font-family: Arial, sans-serif;">
                REASON:
              </td>
              ${isGreen ? `
                ${checkboxField('TIME', part.removalReason === 'TIME')}
                ${checkboxField('FAILURE', part.removalReason === 'FAILURE')}
                ${checkboxField('CONDITION', part.removalReason === 'CONDITION')}
                ${checkboxField('OTHER', part.removalReason === 'OTHER')}
              ` : `
                ${checkboxField('STG', part.removalReason === 'STORAGE')}
                ${checkboxField('T.SH', part.removalReason === 'TROUBLESHOOTING')}
                ${checkboxField('ASST', part.removalReason === 'ASSISTANCE')}
                ${checkboxField('OTH', part.removalReason === 'OTHER')}
              `}
            </tr>
          </table>
        </td>
      </tr>
    `;
        if (part.tagColor === TagColor.WHITE) {
            section04Content += `<tr>${field('STORAGE LOC / ALMACÉN', part.physicalStorageLocation || part.location || '', 12, '25%')}</tr>`;
        }
    } else if (part.tagColor === TagColor.RED) {
        section04Content = `<tr>${field('REJECTION / MOTIVO', `<span style="color: #f43f5e; font-weight: bold;">${part.rejectionReason || ''}</span>`, 12, '25%')}</tr>`;
    }

    // Tech Report for GREEN
    let section05TechReport = '';
    if (part.tagColor === TagColor.GREEN) {
        section05TechReport = `
      <tr>
        <td colspan="12" style="border: 1px solid black; padding: 6px; min-height: 40px; background-color: white; font-family: Arial, sans-serif;">
          <p style="margin: 0 0 4px 0; font-size: 7px; font-weight: bold; text-transform: uppercase; color: #94a3b8;">TECH REPORT / REPORTE TÉCNICO:</p>
          <p style="margin: 0; font-size: 10px; font-weight: normal; line-height: 1.4; color: #0f172a;">${part.technicalReport || 'N/A'}</p>
        </td>
      </tr>
    `;
    }

    // QR Code section
    let qrSection = '';
    if (includeQR) {
        const qrUrl = `${baseUrl}/#/scan/${part.id}`;
        const qrDataUri = generateQRDataUri(qrUrl, 80);
        qrSection = `
      <td rowspan="5" style="width: 90px; border: 1px solid black; padding: 4px; vertical-align: top; background: white;">
        <img src="${qrDataUri}" style="width: 80px; height: 80px;" alt="QR Code" />
        <p style="margin: 4px 0 0 0; font-size: 6px; text-align: center; color: #64748b; font-family: Arial, sans-serif;">SCAN FOR<br/>QUICK ACTION</p>
      </td>
    `;
    }

    // Signature handling (CID for email, data URI for web/print)
    const techSigSrc = mode === 'email' && part.technicianSignature
        ? 'cid:tech_signature'
        : (part.technicianSignature || '');
    const inspSigSrc = mode === 'email' && part.inspectorSignature
        ? 'cid:inspector_signature'
        : (part.inspectorSignature || '');

    // Build the full HTML
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; background-color: ${mode === 'email' ? '#f1f5f9' : 'white'}; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 800px; margin: 0 auto; background-color: white;">
    <tr>
      <td style="border: 10px solid ${tagInfo.hex}; padding: 20px;">
        
        <!-- HEADER -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-bottom: 2px solid black; margin-bottom: 8px; padding-bottom: 8px;">
          <tr>
            <td width="33%" style="vertical-align: middle;">
              <h1 style="margin: 0; font-size: 18px; font-weight: 900; color: #0f172a; line-height: 1; font-family: Arial, sans-serif;">INVENTORY</h1>
              <h1 style="margin: 0; font-size: 18px; font-weight: 900; color: #0f172a; line-height: 1; font-family: Arial, sans-serif;">PART</h1>
              <p style="margin: 2px 0 0 0; font-size: 7px; font-weight: bold; text-transform: uppercase; color: #64748b; font-family: Arial, sans-serif; letter-spacing: 0.1em;">Aviation Technical Record</p>
            </td>
            <td width="67%" style="text-align: right; vertical-align: middle;">
              <div style="display: inline-block; border: 2px solid black; padding: 6px 16px; background-color: #f9fafb;">
                <h2 style="margin: 0; font-size: 18px; font-weight: 900; text-transform: uppercase; color: #0f172a; font-family: Arial, sans-serif; letter-spacing: -0.02em;">${tagInfo.name}</h2>
              </div>
            </td>
          </tr>
        </table>
        
        <!-- MAIN CONTENT TABLE -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
          
          <!-- 01. ADMINISTRATIVE RECORD -->
          ${sectionHeader('01. ADMINISTRATIVE RECORD / DATOS DE REGISTRO')}
          <tr>
            ${field('ORGANIZATION / ORG', part.organization || 'World Class Aviation', 8, '33%')}
            ${field('REG. DATE', regDate, 4, '50%')}
          </tr>
          <tr>
            ${field('PHONE / TEL', part.companyPhone || '', 6, '33%')}
            ${field('EMAIL', part.companyEmail || '', 6, '25%')}
          </tr>
          
          <!-- 02. TECHNICAL IDENTIFICATION -->
          ${sectionHeader('02. TECHNICAL IDENTIFICATION / IDENTIFICACIÓN TÉCNICA')}
          <tr>
            ${field('PART NAME / NOMBRE', part.partName || '', 12, '25%')}
            ${includeQR ? qrSection : ''}
          </tr>
          <tr>
            ${field('P/N (PART NUMBER)', part.pn || '', includeQR ? 10 : 12, '25%')}
          </tr>
          <tr>
            ${field('S/N (SERIAL NUMBER)', part.sn || '', includeQR ? 10 : 12, '25%')}
          </tr>
          <tr>
            ${field('BRAND / MARCA', part.brand || '', includeQR ? 10 : 12, '25%')}
          </tr>
          <tr>
            ${field('MODEL / MODELO', part.model || '', includeQR ? 10 : 12, '25%')}
          </tr>
          
          <!-- 03. TIMES AND CYCLES -->
          ${sectionHeader('03. TIMES AND CYCLES / TIEMPOS Y CICLOS')}
          <tr>
            ${timesCycleBox('TAT / T.T', part.ttTat || '')}
            ${timesCycleBox('TSO', part.tso || '')}
            ${timesCycleBox('T. REM', part.trem || '')}
            ${timesCycleBox('TOTAL / TC', part.tc || '')}
            ${timesCycleBox('CSO', part.cso || '')}
            ${timesCycleBox('C. REM', part.crem || '')}
          </tr>
          
          <!-- 04. CONDITION & REMOVAL -->
          ${sectionHeader('04. CONDITION & REMOVAL / CONDICIÓN Y REMOCIÓN')}
          ${section04Content}
          
          <!-- 05. TECH REPORTS & REMARKS -->
          ${sectionHeader('05. TECH REPORTS & REMARKS / REPORTES Y OBSERVACIONES')}
          ${section05TechReport}
          <tr>
            <td colspan="12" style="border: 1px solid black; padding: 6px; min-height: 35px; background-color: white; font-family: Arial, sans-serif;">
              <p style="margin: 0 0 4px 0; font-size: 7px; font-weight: bold; text-transform: uppercase; color: #94a3b8;">REMARKS / OBSERVACIONES:</p>
              <p style="margin: 0; font-size: 10px; font-weight: normal; line-height: 1.4; color: #0f172a;">${part.observations || 'N/A'}</p>
            </td>
          </tr>
          
          <!-- SIGNATURES -->
          <tr>
            <td colspan="12" style="padding-top: 16px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="1" style="border-collapse: collapse; border: 1px solid black;">
                <tr>
                  <!-- Technical Certification -->
                  <td width="50%" style="border-right: 1px solid black; padding: 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color: #f8fafc; border-bottom: 1px solid black; padding: 4px; text-align: center;">
                          <span style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: #64748b; font-family: Arial, sans-serif;">TECHNICAL CERTIFICATION / CERTIFICACIÓN TÉCNICA</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px; background-color: #fafafa; min-height: 80px;">
                          <p style="margin: 0 0 4px 0; font-size: 8px; font-weight: bold; text-transform: uppercase; color: #94a3b8; font-family: Arial, sans-serif;">NAME / LIC:</p>
                          <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #0f172a; font-family: Arial, sans-serif;">${part.technicianName || ''}</p>
                          <div style="background-color: #eef2ff; border: 1px solid #c7d2fe; padding: 4px 8px; border-radius: 4px; text-align: center; display: inline-block;">
                            <p style="margin: 0; font-size: 10px; font-weight: 900; color: #4338ca; text-transform: uppercase; font-family: Arial, sans-serif;">LIC: ${part.technicianLicense || ''}</p>
                          </div>
                          ${techSigSrc ? `<div style="margin-top: 8px; text-align: center;"><img src="${techSigSrc}" style="max-height: 60px; max-width: 100%; object-fit: contain;" alt="Technician Signature" /></div>` : ''}
                        </td>
                      </tr>
                    </table>
                  </td>
                  
                  <!-- Final Inspection -->
                  <td width="50%" style="padding: 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color: #f8fafc; border-bottom: 1px solid black; padding: 4px; text-align: center;">
                          <span style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: #64748b; font-family: Arial, sans-serif;">FINAL INSPECTION / INSPECCIÓN FINAL</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px; background-color: #fafafa; min-height: 80px;">
                          <p style="margin: 0 0 4px 0; font-size: 8px; font-weight: bold; text-transform: uppercase; color: #94a3b8; font-family: Arial, sans-serif;">NAME / LIC:</p>
                          <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #0f172a; font-family: Arial, sans-serif;">${part.inspectorName || ''}</p>
                          <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 4px 8px; border-radius: 4px; text-align: center; display: inline-block;">
                            <p style="margin: 0; font-size: 10px; font-weight: 900; color: #047857; text-transform: uppercase; font-family: Arial, sans-serif;">LIC: ${part.inspectorLicense || ''}</p>
                          </div>
                          ${inspSigSrc ? `<div style="margin-top: 8px; text-align: center;"><img src="${inspSigSrc}" style="max-height: 60px; max-width: 100%; object-fit: contain;" alt="Inspector Signature" /></div>` : ''}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- CERTIFICATION TEXT -->
          <tr>
            <td colspan="12" style="padding: 16px; margin-top: 16px; border: 1px solid black; text-align: center; background-color: #f9fafb;">
              <p style="margin: 0; font-size: 9px; font-weight: 900; text-transform: uppercase; line-height: 1.4; color: #0f172a; font-family: Arial, sans-serif; letter-spacing: -0.01em;">
                ${certText}
              </p>
            </td>
          </tr>
          
          <!-- FOOTER -->
          <tr>
            <td colspan="12" style="padding-top: 16px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size: 8px; font-weight: 900; text-transform: uppercase; color: #94a3b8; font-family: Arial, sans-serif; letter-spacing: 0.1em;">
                    RECORD ID: ${part.id || ''}
                  </td>
                  <td style="text-align: center; font-size: 8px; font-weight: 900; text-transform: uppercase; color: #94a3b8; font-family: Arial, sans-serif; background-color: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-style: italic;">
                    DIGITALLY GENERATED DOCUMENT - SECURE AVIATION CERTIFICATION LAYER
                  </td>
                  <td style="text-align: right; font-size: 8px; font-weight: 900; text-transform: uppercase; color: #94a3b8; font-family: Arial, sans-serif; letter-spacing: 0.1em;">
                    DATE: ${new Date().toLocaleDateString()}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
