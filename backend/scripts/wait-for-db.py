"""
Script de utilidad para esperar a que la base de datos Postgres esté lista.
Uso recomendado: Solo en tareas de inicialización o migraciones.
NO se recomienda ejecutarlo automáticamente en cada inicio de la API en producción.
"""

import os
import sys
import time
from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError

# Configuración desde el entorno con valores por defecto seguros
DATABASE_URL = os.environ.get('DATABASE_URL')
MAX_RETRIES = int(os.environ.get('DB_WAIT_RETRIES', 30))
DELAY_SECONDS = int(os.environ.get('DB_WAIT_DELAY', 2))

def wait_for_db():
    if not DATABASE_URL:
        print("[-] DATABASE_URL no definida. Omitiendo verificación de base de datos.")
        return

    # Extraer host y usuario para el log (sin mostrar password)
    try:
        from urllib.parse import urlparse
        parsed = urlparse(DATABASE_URL)
        db_user = parsed.username or "desconocido"
        db_host = parsed.hostname or "localhost"
    except Exception:
        db_host = "desconocido"
        db_user = "desconocido"

    print(f"[*] Esperando base de datos en {db_host} como usuario '{db_user}' ({MAX_RETRIES} reintentos)...")

    for i in range(MAX_RETRIES):
        try:
            # Intentamos una conexión mínima y una query trivial para validar AUTH
            engine = create_engine(DATABASE_URL)
            with engine.connect() as conn:
                from sqlalchemy import text
                conn.execute(text("SELECT 1"))
                print("[\u2705] Base de datos lista y autenticada (SELECT 1 OK).")
                return
        except (OperationalError, Exception) as e:
            error_msg = str(e)
            # FAIL FAST: Si el error es de autenticación/roles, NO REINTENTAR.
            if 'role "admin" does not exist' in error_msg or 'password authentication failed' in error_msg:
                print(f"\n[❌] ERROR FATAL DE DESPLIEGUE: {error_msg}")
                print("[❌] La base de datos está desincronizada (Rol 'admin' no existe).")
                print("[💡] SOLUCIÓN: Ejecuta './rebuild.sh' para borrar el volumen corrupto y reiniciar.\n")
                sys.exit(1) # Salir con error para detener el contenedor inmediatamente
            
            if i < MAX_RETRIES - 1:
                print(f"[-] [{i+1}/{MAX_RETRIES}] Fallo de conexión: {e}")
                print(f"[-] Reintentando en {DELAY_SECONDS}s...")
                time.sleep(DELAY_SECONDS)
            else:
                print(f"[\u274c] Agotados los reintentos. No se pudo conectar a la base de datos.")
                sys.exit(1)

if __name__ == "__main__":
    wait_for_db()
