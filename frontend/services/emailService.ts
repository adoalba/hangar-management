
import { AviationPart, User, TagColor } from '../types';
import { TRANSLATIONS, BILINGUAL_LABELS } from '../constants';

export interface EmailLog {
  status: 'info' | 'success' | 'error';
  message: string;
  timestamp: string;
}

export const sendUserInvitation = async (
  user: User,
  onLog: (log: EmailLog) => void,
  token: string
): Promise<boolean> => {
  const addLog = (msg: string, status: 'info' | 'success' | 'error' = 'info') => {
    onLog({ status, message: msg, timestamp: new Date().toLocaleTimeString() });
  };

  const loginUrl = window.location.origin;

  try {
    addLog(`Despachando invitación bilingüe a ${user.email}...`);
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        recipient: user.email,
        subject: `Acceso Autorizado Hangar | Authorized Hangar Access`,
        html_body: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: auto; background: #ffffff; border-radius: 24px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
            <div style="background: #4f46e5; padding: 40px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 26px; text-transform: uppercase; letter-spacing: 2px; font-weight: 900;">World Class Aviation</h1>
              <p style="margin: 5px 0 0; font-size: 11px; text-transform: uppercase; opacity: 0.8; letter-spacing: 3px; font-weight: bold;">Hangar Terminal Security</p>
            </div>
            <div style="padding: 45px; color: #1e293b;">
              <h2 style="margin-top: 0; font-size: 22px; font-weight: 800; color: #111827;">Bienvenido / Welcome, ${user.name}</h2>
              <p style="font-size: 15px; line-height: 1.7; color: #475569;">
                Su perfil técnico ha sido habilitado en el terminal central de logística aeronáutica. 
                Para completar la activación, ingrese con el siguiente usuario y clave temporal.
                <br><br>
                <i>Your technical profile has been enabled at the central aviation logistics terminal. 
                To complete activation, log in with the following username and temporary password.</i>
              </p>
              
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 25px; margin: 35px 0; text-align: center;">
                <p style="margin: 0; font-size: 11px; color: #64748b; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">ID Usuario / Username</p>
                <div style="font-family: 'Courier New', monospace; font-size: 24px; font-weight: 900; color: #4f46e5; margin-bottom: 20px;">${user.username}</div>
                
                <p style="margin: 0; font-size: 11px; color: #64748b; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">Clave Temporal / Temp Password</p>
                <div style="font-family: 'Courier New', monospace; font-size: 18px; font-weight: 900; color: #1e293b; background: #f1f5f9; padding: 10px 20px; border-radius: 8px; display: inline-block;">${user.password}</div>
              </div>

              <div style="background: #fff9eb; border: 1px solid #fde68a; border-radius: 12px; padding: 15px; margin-bottom: 30px; text-align: center;">
                <p style="margin: 0; font-size: 12px; color: #92400e; font-weight: bold;">
                  AVISO: Se requiere el cambio obligatorio de contraseña al ingresar (Min. 10 caracteres).<br>
                  <i>NOTICE: Mandatory password change required upon first login (Min. 10 chars).</i>
                </p>
              </div>

              <div style="text-align: center;">
                <a href="${loginUrl}" style="background: #4f46e5; color: #ffffff; padding: 18px 40px; border-radius: 16px; text-decoration: none; font-weight: 900; font-size: 14px; text-transform: uppercase; display: inline-block;">
                  Acceder al Sistema / Access Terminal
                </a>
              </div>
            </div>
            <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
               <p style="margin: 0; font-size: 10px; color: #94a3b8; font-weight: bold;">© World Class Aviation Central Hub | Secure Terminal Layer 4.0</p>
            </div>
          </div>
        `
      })
    });

    if (response.ok) {
      addLog(`Invitación bilingüe enviada correctamente.`, 'success');
      return true;
    } else {
      addLog(`Error SMTP: Verifique configuración del servidor de despacho.`, 'error');
      return false;
    }
  } catch (err) {
    addLog("Error de red: Terminal de despacho inaccesible.", 'error');
    return false;
  }
};

export const sendUserCredentials = async (
  user: User,
  onLog: (log: EmailLog) => void,
  token: string
): Promise<boolean> => {
  const addLog = (msg: string, status: 'info' | 'success' | 'error' = 'info') => {
    onLog({ status, message: msg, timestamp: new Date().toLocaleTimeString() });
  };

  try {
    addLog(`Confirmando envío de credenciales manuales a ${user.email}...`);
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        recipient: user.email,
        subject: `Notificación de Credenciales | Access Credentials`,
        html_body: `
          <div style="font-family: sans-serif; max-width: 500px; margin: auto; border: 1px solid #ddd; padding: 30px; border-radius: 10px;">
            <h2 style="color: #4f46e5;">Acceso World Class Aviation</h2>
            <p>Hola <b>${user.name}</b>,</p>
            <p>Sus credenciales de acceso para el terminal de hangar son:</p>
            <div style="background: #f4f4f4; padding: 20px; border-radius: 5px; font-family: monospace;">
              <b>Usuario:</b> ${user.username}<br>
              <b>Clave:</b> ${user.password}
            </div>
            <p style="color: red; font-size: 12px; margin-top: 20px;">Por seguridad, esta clave es temporal y el sistema le pedirá cambiarla al ingresar.</p>
          </div>
        `
      })
    });

    if (response.ok) {
      addLog(`Credenciales enviadas correctamente.`, 'success');
      return true;
    }
    return false;
  } catch (e) {
    addLog(`Fallo en el despacho de credenciales.`, 'error');
    return false;
  }
};

// Helper functions for email HTML generation (inline CSS, table-based)
const getTagColorHex = (tag: TagColor): string => {
  switch (tag) {
    case TagColor.YELLOW: return '#eab308';
    case TagColor.GREEN: return '#10b981';
    case TagColor.WHITE: return '#cbd5e1';
    case TagColor.RED: return '#f43f5e';
    default: return '#6366f1';
  }
};

const getTagTitle = (tag: TagColor): string => {
  switch (tag) {
    case TagColor.YELLOW: return 'SERVICEABLE MATERIAL / MATERIAL APROBADO';
    case TagColor.GREEN: return 'REPAIRABLE MATERIAL / MATERIAL REPARABLE';
    case TagColor.WHITE: return 'REMOVED NO DEFECT / REMOVIDO SIN FALLA';
    case TagColor.RED: return 'REJECTED MATERIAL / MATERIAL RECHAZADO';
    default: return 'AVIATION COMPONENT';
  }
};

const sectionHeader = (title: string): string => `
  <tr>
    <td colspan="12" style="background-color: #0f172a; color: white; padding: 4px 8px; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; font-family: Arial, sans-serif;">
      ${title}
    </td>
  </tr>
`;

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

export const sendEmailViaSmtp = async (recipient: string, part: AviationPart, aiReport: string, onLog: (log: EmailLog) => void, token: string): Promise<boolean> => {
  const addLog = (msg: string, status: 'info' | 'success' | 'error' = 'info') => {
    console.log(`[EmailService] Version: INDUSTRIAL-DESIGN-Tv2 - Msg: ${msg}`);
    onLog({ status, message: msg, timestamp: new Date().toLocaleTimeString() });
  };

  addLog(`Preparando despacho de certificación industrial P/N: ${part.pn}...`);

  // Format shelf life date
  const shelfLifeDate = part?.shelfLife
    ? new Date(part.shelfLife).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'N/A';

  // Get tag-specific properties
  const borderColor = getTagColorHex(part.tagColor);
  const tagTitle = getTagTitle(part.tagColor);

  // Build certification text based on tag color
  let certificationText = '';
  switch (part.tagColor) {
    case TagColor.YELLOW:
      certificationText = 'WORLD CLASS AVIATION CERTIFIES that this component/material meets the requirements of applicable manuals and current reference documents. Approved for use as SERVICEABLE MATERIAL. / CERTIFICA que este componente / material cumple con los requisitos de los manuales aplicables y documentos de referencia vigentes. Aprueba este componente como MATERIAL APROBADO para uso.';
      break;
    case TagColor.GREEN:
      certificationText = 'WORLD CLASS AVIATION CERTIFIES that this component/material meets internal manuals and reference document requirements. / CERTIFICA que este componente / material cumple con los requisitos de manuales internos y documentos de referencia.';
      break;
    case TagColor.WHITE:
      certificationText = 'REMOVED FOR DESCRIBED REASON AND MEETS CURRENT REQUIREMENTS. / REMOVIDO POR LA RAZÓN DESCRITA Y CUMPLE CON REQUISITOS VIGENTES.';
      break;
    case TagColor.RED:
      certificationText = 'DOES NOT MEET APPLICABLE REQUIREMENTS. REJECTED FOR USE. / NO CUMPLE REQUISITOS APLICABLES. RECHAZADO PARA USO.';
      break;
  }

  // Build Section 04 content dynamically based on tag color
  let section04Content = '';

  if (part.tagColor === TagColor.YELLOW) {
    section04Content = `
      <tr>
        ${field('SHELF LIFE / FECHA VENC.', `<span style="color: #f43f5e; font-weight: 900;">${shelfLifeDate}</span>`, 12, '25%')}
      </tr>
    `;
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
      section04Content += `
        <tr>
          ${field('STORAGE LOC / ALMACÉN', part.physicalStorageLocation || part.location || '', 12, '25%')}
        </tr>
      `;
    }
  } else if (part.tagColor === TagColor.RED) {
    section04Content = `
      <tr>
        ${field('REJECTION / MOTIVO', `<span style="color: #f43f5e; font-weight: bold;">${part.rejectionReason || ''}</span>`, 12, '25%')}
      </tr>
    `;
  }

  // Build Section 05 content (Tech Report for GREEN cards)
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

  // Prepare signature images for embedding
  const attachments: { [key: string]: string } = {};

  if (part.technicianSignature) {
    attachments['tech_signature'] = part.technicianSignature;
    addLog('Preparando firma de técnico para embedding...');
  }

  if (part.inspectorSignature) {
    attachments['inspector_signature'] = part.inspectorSignature;
    addLog('Preparando firma de inspector para embedding...');
  }

  const html_body = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 20px; background-color: #f1f5f9; font-family: Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 800px; margin: 0 auto; background-color: white;">
        <tr>
          <td style="border: 10px solid ${borderColor}; padding: 20px;">
            
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
                    <h2 style="margin: 0; font-size: 18px; font-weight: 900; text-transform: uppercase; color: #0f172a; font-family: Arial, sans-serif; letter-spacing: -0.02em;">${tagTitle}</h2>
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
                ${field('REG. DATE', part.registrationDate ? new Date(part.registrationDate).toLocaleDateString('en-US') : '', 4, '50%')}
              </tr>
              <tr>
                ${field('PHONE / TEL', part.companyPhone || '', 6, '33%')}
                ${field('EMAIL', part.companyEmail || '', 6, '25%')}
              </tr>
              
              <!-- 02. TECHNICAL IDENTIFICATION -->
              ${sectionHeader('02. TECHNICAL IDENTIFICATION / IDENTIFICACIÓN TÉCNICA')}
              <tr>
                ${field('PART NAME / NOMBRE', part.partName || '', 12, '25%')}
              </tr>
              <tr>
                ${field('P/N (PART NUMBER)', part.pn || '', 12, '25%')}
              </tr>
              <tr>
                ${field('S/N (SERIAL NUMBER)', part.sn || '', 12, '25%')}
              </tr>
              <tr>
                ${field('BRAND / MARCA', part.brand || '', 12, '25%')}
              </tr>
              <tr>
                ${field('MODEL / MODELO', part.model || '', 12, '25%')}
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
              
              <!-- 04. CONDITION & REMOVAL (DYNAMIC) -->
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
              
              <!-- SIGNATURES SECTION -->
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
                              ${part.technicianSignature ? `
                              <div style="margin-top: 8px; text-align: center;">
                                <img src="cid:tech_signature" style="max-height: 60px; max-width: 100%; object-fit: contain;" alt="Technician Signature" />
                              </div>
                              ` : ''}
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
                              ${part.inspectorSignature ? `
                              <div style="margin-top: 8px; text-align: center;">
                                <img src="cid:inspector_signature" style="max-height: 60px; max-width: 100%; object-fit: contain;" alt="Inspector Signature" />
                              </div>
                              ` : ''}
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
                    ${certificationText}
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
  `;

  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        recipient,
        subject: `Certificación Industrial Aeronáutica | P/N: ${part.pn} S/N: ${part.sn}`,
        html_body,
        attachments: Object.keys(attachments).length > 0 ? attachments : undefined
      })
    });

    if (response.ok) {
      addLog("Certificación industrial enviada exitosamente.", "success");
      return true;
    }
    addLog("Error crítico en servidor SMTP.", "error");
    return false;
  } catch (e) {
    addLog("Error de conexión API.", "error");
    return false;
  }
};
