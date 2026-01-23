import smtplib
import ssl
import json
import os
import logging
from email.message import EmailMessage

CONFIG_PATH = "email_config.json"
logger = logging.getLogger(__name__)

def load_config():
    """Carga la configuración de correo desde el archivo JSON."""
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error cargando email_config.json: {e}")
            
    return {
        "method": "SMTP",
        "smtp_server": "smtp.gmail.com",
        "smtp_port": 587,
        "smtp_user": "",
        "smtp_pass": "",
        "resend_key": "",
        "resend_from": "operaciones@aerologistics.com"
    }

def send_via_smtp(cfg, recipient, subject, html_body, diagnostic_logs=None):
    """Envía un correo electrónico utilizando SMTP con soporte para SSL/STARTTLS."""
    def log(msg):
        logger.info(msg)
        if diagnostic_logs is not None:
            diagnostic_logs.append(msg)

    try:
        method = cfg.get('method', 'SMTP')
        if method == 'SMTP':
            server_addr = cfg.get('smtp_server')
            port = int(cfg.get('smtp_port', 587))
            user = cfg.get('smtp_user')
            password = cfg.get('smtp_pass')

            if not server_addr or not user or not password:
                return False, "Configuración SMTP incompleta (servidor, usuario o clave faltantes)."

            msg = EmailMessage()
            msg['Subject'] = subject
            msg['From'] = user
            msg['To'] = recipient
            msg.set_content("AeroLogistics Pro - Requiere cliente con soporte HTML.")
            msg.add_alternative(html_body, subtype='html')

            context = ssl.create_default_context()
            
            log(f"Conectando a {server_addr}:{port}...")
            
            # Soporte para SSL directo (puerto 465) o STARTTLS (otros puertos)
            if port == 465:
                with smtplib.SMTP_SSL(server_addr, port, context=context) as server:
                    log("Conexión SSL establecida. Autenticando...")
                    server.login(user, password)
                    log("Autenticación exitosa. Enviando mensaje...")
                    server.send_message(msg)
            else:
                with smtplib.SMTP(server_addr, port) as server:
                    log("Conexión establecida. Iniciando STARTTLS...")
                    server.starttls(context=context)
                    log("STARTTLS exitoso. Autenticando...")
                    server.login(user, password)
                    log("Autenticación exitosa. Enviando mensaje...")
                    server.send_message(msg)
            
            log("Email enviado exitosamente.")
            return True, "Email enviado exitosamente vía SMTP."
        
        elif method == 'API':
            return False, "Método API no implementado en esta versión."
            
        return False, f"Método de envío '{method}' no reconocido."
        
    except smtplib.SMTPAuthenticationError:
        error_msg = "Error de autenticación: Usuario o contraseña incorrectos. Si usas Gmail, recuerda usar una 'Contraseña de Aplicación'."
        log(error_msg)
        return False, error_msg
    except Exception as e:
        error_msg = f"Fallo en el protocolo de correo: {str(e)}"
        log(error_msg)
        return False, error_msg
