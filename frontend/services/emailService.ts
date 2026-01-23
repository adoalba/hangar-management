
import { AviationPart, User, TagColor } from '../types';
import { GoogleGenAI } from "@google/genai";
import { TRANSLATIONS, BILINGUAL_LABELS } from '../constants';

const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

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

export const sendEmailViaSmtp = async (recipient: string, part: AviationPart, aiReport: string, onLog: (log: EmailLog) => void, token: string): Promise<boolean> => {
  const addLog = (msg: string, status: 'info' | 'success' | 'error' = 'info') => {
    onLog({ status, message: msg, timestamp: new Date().toLocaleTimeString() });
  };
  
  addLog(`Preparando despacho de reporte técnico P/N: ${part.pn}...`);
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        recipient,
        subject: `Reporte Técnico Aeronáutico | P/N: ${part.pn} S/N: ${part.sn}`,
        html_body: `
           <div style="font-family: sans-serif;">
             <h2>Certificación de Componente Aeronáutico</h2>
             <p><b>Componente:</b> ${part.partName}</p>
             <p><b>P/N:</b> ${part.pn}</p>
             <p><b>Ubicación:</b> ${part.location}</p>
             <p>Este reporte ha sido generado automáticamente por el sistema World Class Aviation Hub.</p>
           </div>
        `
      })
    });
    if (response.ok) {
      addLog("Reporte enviado exitosamente.", "success");
      return true;
    }
    addLog("Error crítico en servidor SMTP.", "error");
    return false;
  } catch (e) {
    addLog("Error de conexión API.", "error");
    return false;
  }
};
