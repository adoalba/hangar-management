
import os
from sqlalchemy import create_engine, Column, String, Boolean, Text, JSON, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# --- CONFIGURACIÓN CENTRALIZADA DE LA CAPA DE DATOS ---
DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///./inventory.db')
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL)
else:
    engine = create_engine(DATABASE_URL, pool_size=20, max_overflow=0)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- DEFINICIÓN DE MODELOS ---

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, nullable=False)
    role = Column(String, nullable=False)
    active = Column(Boolean, default=True)
    password = Column(String, nullable=True) # Permitimos nulo si aún no se ha configurado
    suspended = Column(Boolean, default=False)
    must_change_password = Column(Boolean, default=True)
    setup_token = Column(String, unique=True, index=True, nullable=True)
    setup_token_expiry = Column(DateTime, nullable=True)

class UserSession(Base):
    __tablename__ = "user_sessions"
    token = Column(String, primary_key=True)
    user_id = Column(String, index=True)
    expiry = Column(DateTime, nullable=False)

class AviationPart(Base):
    __tablename__ = "parts"
    id = Column(String, primary_key=True)
    tag_color = Column(String, index=True)
    part_name = Column(String, index=True)
    brand = Column(String)
    model = Column(String)
    pn = Column(String, index=True)
    sn = Column(String, index=True)
    tt_tat = Column(String)
    tso = Column(String)
    trem = Column(String)
    tc = Column(String)
    cso = Column(String)
    crem = Column(String)
    registration_date = Column(String)
    location = Column(String, index=True)
    photo = Column(Text)
    
    organization = Column(String)
    company_address = Column(String)
    company_phone = Column(String)
    company_email = Column(String)

    technician_name = Column(String)
    technician_license = Column(String)
    technician_signature = Column(Text)
    inspector_name = Column(String)
    inspector_license = Column(String)
    inspector_signature = Column(Text)
    signed_by_technician = Column(Boolean, default=False)
    signed_by_inspector = Column(Boolean, default=False)

    shelf_life = Column(String)
    removal_reason = Column(String)
    technical_report = Column(Text)
    removed_from_ac = Column(String)
    position = Column(String)
    physical_storage_location = Column(String)
    rejection_reason = Column(Text)
    final_disposition = Column(String)
    observations = Column(Text)

    history = Column(JSON)
