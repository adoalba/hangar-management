
import os
import sys
import time
from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError

# --- CONFIGURACIÓN ---
DATABASE_URL = os.environ.get('DATABASE_URL')
RETRIES = 30
DELAY = 2

def wait_for_db():
    """
    Intenta conectarse a la base de datos en un bucle.
    Sale con éxito si la conexión es exitosa, o con error si se agotan los reintentos.
    """
    if not DATABASE_URL:
        sys.stdout.write("DATABASE_URL no está configurada, omitiendo la espera.\n")
        return

    db_host = DATABASE_URL.split('@')[1].split('/')[0]
    sys.stdout.write(f"Iniciando protocolo de espera para la base de datos en {db_host}...\n")

    for i in range(RETRIES):
        try:
            engine = create_engine(DATABASE_URL)
            with engine.connect() as connection:
                sys.stdout.write("✅ Conexión con la base de datos establecida con éxito.\n")
                return
        except OperationalError:
            sys.stdout.write(f"Intento {i + 1}/{RETRIES}: Base de datos no disponible. Reintentando en {DELAY}s...\n")
            time.sleep(DELAY)

    sys.stderr.write(f"❌ No se pudo establecer conexión con la base de datos después de {RETRIES} intentos.\n")
    sys.exit(1)

if __name__ == "__main__":
    wait_for_db()
