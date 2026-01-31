
import os
import sys
import uuid
from werkzeug.security import generate_password_hash

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.models import SessionLocal, User, Base

def create_initial_admin():
    db = SessionLocal()
    
    admin = db.query(User).filter(User.username == "admin").first()
    hashed_pw = generate_password_hash("Admin123!@#")
    
    if admin:
        print("[-] El usuario administrador ya existe. Forzando actualización de contraseña...")
        admin.password = hashed_pw
        admin.active = True
        admin.suspended = False
        try:
            db.commit()
            print("✅ Contraseña de administrador restablecida.")
            print("Acceso: admin / Admin123!@#")
        except Exception as e:
            print(f"❌ Error al actualizar admin: {e}")
            db.rollback()
        finally:
            db.close()
        return

    # Usar el mismo método de hashing que server.py
    hashed_pw = generate_password_hash("Admin123!@#")
    
    new_admin = User(
        id=str(uuid.uuid4()),
        name="System Administrator",
        username="admin",
        email="admin@worldclassaviation.com",
        password=hashed_pw,
        role="ADMIN",
        active=True,
        suspended=False,
        must_change_password=True
    )
    
    db.add(new_admin)
    try:
        db.commit()
        print("✅ Protocolo de seguridad completado.")
        print("Acceso inicial: admin / Admin123!@#")
    except Exception as e:
        print(f"❌ Fallo en la creación de identidad: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_initial_admin()
