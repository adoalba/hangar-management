
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

// New signature supports reportType
export const sendEmailViaSmtp = async (
  recipient: string,
  part: AviationPart,
  aiReport: string, // Kept for signature compatibility but unused
  onLog: (log: EmailLog) => void,
  token: string,
  reportType: string = 'CARD' // New parameter defaulting to 'CARD'
): Promise<boolean> => {
  const addLog = (msg: string, status: 'info' | 'success' | 'error' = 'info') => {
    console.log(`[EmailService] Sending ${reportType} report via Backend API`);
    onLog({ status, message: msg, timestamp: new Date().toLocaleTimeString() });
  };

  addLog(`Solicitando envío de reporte (${reportType}) al backend...`);

  try {
    // We delegate EVERYTHING to the backend now.
    // The backend knows how to generate the perfect PDF (Card or Traceability)
    // and the matching HTML body.

    // NORMALIZE DATA TO MATCH InventoryModule.tsx UNIVERSAL PAYLOAD
    const standardizedItem = {
      ...part, // Preserve original

      // === IDENTITY ===
      pn: part.pn,
      sn: part.sn,

      // === DESCRIPTION ===
      desc: part.partName,
      description: part.partName,
      partName: part.partName,

      // === LOCATION (All variants) ===
      loc: part.location,
      location: part.location,
      physical_location: part.location,

      // === CONDITION ===
      cond: (part as any).condition || part.tagColor,
      condition: (part as any).condition || part.tagColor,
      status: (part as any).condition || part.tagColor,
      tagColor: part.tagColor,

      // === DATES ===
      reg_date: part.registrationDate || new Date().toLocaleDateString(),
      tag_date: part.registrationDate || new Date().toLocaleDateString(),

      // === EXPIRATION ===
      exp: part.shelfLife || 'N/A',
      expiration_date: part.shelfLife || 'N/A',
      shelf_life: part.shelfLife || 'N/A',

      // === TRACEABILITY ===
      trace: (part as any).traceability || (part as any).source || 'N/A',
      source: (part as any).traceability || (part as any).source || 'N/A',

      // === TECHNICAL DATA ===
      tsn: (part as any).tsn || (part as any).time_since_new || '-',
      csn: (part as any).csn || (part as any).cycles_since_new || '-',
      tso: part.tso || (part as any).time_since_overhaul || '-',
      cso: part.cso || (part as any).cycles_since_overhaul || '-',
      tsr: (part as any).tsr || '-',
      csr: (part as any).csr || '-',
      trem: (part as any).trem || (part as any).time_remaining || '-',
      crem: (part as any).crem || (part as any).cycles_remaining || '-',

      // === OTHER ===
      qty: (part as any).quantity || (part as any).qty || '1',
      manuf: (part as any).manufacturer || part.brand || 'GENERIC',
      brand: (part as any).manufacturer || part.brand || 'GENERIC',
      model: (part as any).model || '-'
    };

    const response = await fetch('/api/reports/send-card-unified', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        recipient,
        reportData: {
          data: [standardizedItem],
          reportType: reportType, // 'CARD'
          reportId: `${reportType}-${part.pn}`
        }
      })
    });

    if (response.ok) {
      addLog("Reporte enviado exitosamente con PDF adjunto.", "success");
      return true;
    } else {
      const errData = await response.json();
      addLog(`Error servidor: ${errData.error || 'Desconocido'}`, 'error');
      return false;
    }

  } catch (e) {
    addLog("Error de red al contactar servidor de reportes.", "error");
    console.error(e);
    return false;
  }
};
