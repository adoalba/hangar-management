
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.models import Base, engine, User, UserSession, AviationPart

def init_database():
    """
    Crea todas las tablas de la base de datos definidas en los modelos de SQLAlchemy.
    Esta función es idempotente; no intentará recrear tablas que ya existen.
    """
    sys.stdout.write("Iniciando protocolo de creación de esquema de base de datos...\n")
    try:
        # Al importar todos los modelos (User, UserSession, AviationPart),
        # nos aseguramos de que estén registrados en la metadata de Base.
        # Esta línea crea todas las tablas registradas si no existen.
        Base.metadata.create_all(bind=engine)
        sys.stdout.write("✅ Esquema de base de datos verificado/creado exitosamente.\n")
    except Exception as e:
        sys.stderr.write(f"❌ Error crítico al crear el esquema de la base de datos: {e}\n")
        sys.exit(1)

if __name__ == "__main__":
    init_database()
