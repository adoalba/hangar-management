
import os
from sqlalchemy import create_engine, Column, String, Boolean, Text, JSON, DateTime, ForeignKey
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


class ReportLog(Base):
    """
    Audit trail for report acknowledgments.
    Once created, these records are READ-ONLY for compliance.
    """
    __tablename__ = "report_logs"
    
    id = Column(String, primary_key=True)
    report_id = Column(String, index=True, nullable=False)  # RPT-YYYYMMDD-XXXXXX
    report_type = Column(String, nullable=False)
    user_id = Column(String, ForeignKey("users.id"), index=True, nullable=False)
    user_name = Column(String, nullable=False)
    acknowledge_timestamp = Column(DateTime, nullable=False)
    device_fingerprint = Column(String)  # User-Agent + IP hash
    recipient_email = Column(String)
    item_count = Column(String)  # Number of items in report
    filters_applied = Column(JSON)  # Stored filters for traceability
    status = Column(String, default='ACKNOWLEDGED')  # ACKNOWLEDGED, PENDING
    created_at = Column(DateTime, nullable=False)


class ReportApprovalToken(Base):
    """
    Temporary tokens for report approval via email link.
    Tokens expire after 7 days for security.
    """
    __tablename__ = "report_approval_tokens"
    
    token = Column(String, primary_key=True)  # UUID-based unique token
    report_id = Column(String, index=True, nullable=False)
    report_type = Column(String, nullable=False)
    report_data = Column(JSON)  # Snapshot of report at time of email
    recipient_email = Column(String, nullable=False)
    sent_by_user_id = Column(String, nullable=False)
    sent_by_user_name = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    acknowledged = Column(Boolean, default=False)
    acknowledged_at = Column(DateTime, nullable=True)
    acknowledged_by_user_id = Column(String, nullable=True)
    acknowledged_by_user_name = Column(String, nullable=True)
    device_fingerprint = Column(String, nullable=True)


class Contact(Base):
    """
    Directory of frequent contacts for report dispatch.
    """
    __tablename__ = "contacts"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    organization = Column(String)
    role = Column(String) # E.g. 'Quality Manager', 'External', etc.
    created_at = Column(DateTime, nullable=False)

