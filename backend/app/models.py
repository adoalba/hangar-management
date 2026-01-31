
import os
from sqlalchemy import create_engine, Column, String, Boolean, Text, JSON, DateTime, ForeignKey, Integer
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker


# --- CONFIGURACIÓN CENTRALIZADA DE LA CAPA DE DATOS ---
from .config import Paths

# DATABASE CONNECTION STRATEGY
# Mandate: Use Immutable DB_PATH from Paths class
# Logic: sqlite:////app/data/inventory.db (4 slashes for absolute Unix path)

DATABASE_URL = f"sqlite:///{Paths.DB_PATH}"

# Ensure Data Directory Exists at Module Level (Safety Net)
os.makedirs(os.path.dirname(Paths.DB_PATH), exist_ok=True)

# RETRY LOGIC / BUSY TIMEOUT
# timeout=30 seconds (Wait 30s before throwing 'database is locked')
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False, "timeout": 30})

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
    technician_signature_metadata = Column(JSON, nullable=True)
    inspector_name = Column(String)
    inspector_license = Column(String)
    inspector_signature = Column(Text)
    inspector_signature_metadata = Column(JSON, nullable=True)
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


class ReportSnapshot(Base):
    """
    Immutable snapshot of report data for audit and consistent export.
    Stores the exact data returned at generation time.
    """
    __tablename__ = "report_snapshots"

    id = Column(String, primary_key=True) # Matches report_id (RPT-...)
    report_type = Column(String, nullable=False)
    content_snapshot = Column(JSON, nullable=False) # The actual report data
    
    # Metadata fields
    created_at = Column(DateTime, nullable=False)
    expires_at = Column(DateTime, nullable=True) # For cache management
    
    # User requested fields
    created_by = Column(String, index=True) # Unified field as requested
    row_count = Column(String) # For quick stats without parsing JSON (using String to match other count fields in project)


class ComplianceLog(Base):
    """
    Audit log for system health, reconciliation actions, and critical errors.
    Separate from operational report logs.
    """
    __tablename__ = "compliance_logs"
    
    id = Column(String, primary_key=True) # UUID
    timestamp = Column(DateTime, nullable=False)
    event_type = Column(String, index=True, nullable=False) # RECONCILIATION, SNAPSHOT_FIX, SAVE_FAILURE
    severity = Column(String, nullable=False) # INFO, WARNING, CRITICAL
    component = Column(String, index=True) # e.g. 'Reports', 'Inventory'
    details = Column(JSON) # Detailed context
    user_id = Column(String, nullable=True) # System or Admin ID



class ReportArchive(Base):
    """
    Physical Archive Log with strict Traceability to Inventory Items.
    Managed via ACID transaction: Database Record <-> File on Disk.
    """
    __tablename__ = "report_archives"
    
    id = Column(String, primary_key=True) # UUID
    report_id = Column(String, index=True, nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(Text, nullable=False) # Absolute path
    created_at = Column(DateTime, nullable=False)
    
    # Traceability (Nullable, as some reports are 'Total Inventory')
    related_part_id = Column(String, ForeignKey("parts.id"), nullable=True, index=True)
    
    # Integrity
    file_size_bytes = Column(Integer)
    checksum_sha256 = Column(String) # Stronger than MD5
    
    # Context
    user_id = Column(String, nullable=True) # Who generated it
