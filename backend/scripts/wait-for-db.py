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

    # Extraer host para el log (sin mostrar credenciales)
    try:
        db_host = DATABASE_URL.split('@')[1].split('/')[0]
    except IndexError:
        db_host = "desconocido"

    print(f"[*] Esperando base de datos en {db_host} ({MAX_RETRIES} reintentos)...")

    for i in range(MAX_RETRIES):
        try:
            # Intentamos una conexión mínima
            engine = create_engine(DATABASE_URL)
            with engine.connect() as conn:
                print("[\u2705] Base de datos lista para recibir conexiones.")
                return
        except (OperationalError, Exception) as e:
            if i < MAX_RETRIES - 1:
                print(f"[-] [{i+1}/{MAX_RETRIES}] No disponible. Reintentando en {DELAY_SECONDS}s...")
                time.sleep(DELAY_SECONDS)
            else:
                print(f"[\u274c] Agotados los reintentos. No se pudo conectar a la base de datos.")
                sys.exit(1)

if __name__ == "__main__":
    wait_for_db()
