
import os
import hashlib
import logging
from datetime import datetime

from .config import Paths

logger = logging.getLogger(__name__)

# Base Storage Paths
# Base Storage Paths (ABSOLUTE PATHS ONLY)
# Mandate: "Prohibición: No uses . ni rutas relativas".
FINAL_STORAGE_PATH = Paths.STORAGE_ROOT
STORAGE_BASE_DIR = FINAL_STORAGE_PATH
SNAPSHOT_ROOT = os.path.join(os.path.dirname(FINAL_STORAGE_PATH), 'daily_snapshots')

# Ensure Roots Exist immediately
try:
    os.makedirs(STORAGE_BASE_DIR, exist_ok=True)
    os.makedirs(SNAPSHOT_ROOT, exist_ok=True)
except Exception as e:
    logger.error(f"CRITICAL: Failed to create storage roots: {e}")

def verify_storage_permissions():
    """
    Startup Test: Verify storage integrity (Read/Write Access).
    """
    print(f"DEBUG: Current Working Directory: {os.getcwd()}") # Mandate 1
    
    try:
        # Ensure dir exists
        os.makedirs(FINAL_STORAGE_PATH, exist_ok=True)
        
        # Check write permission
        if not os.access(FINAL_STORAGE_PATH, os.W_OK):
             raise PermissionError(f"No write access to {FINAL_STORAGE_PATH}")
        
        logger.info(f"Storage Engine initialized at {FINAL_STORAGE_PATH}")
        print(f"DEBUG: Storage Verification SUCCESS at {FINAL_STORAGE_PATH}") 
    except Exception as e:
        msg = f"STORAGE_CHECK: ❌ FAILED to access {FINAL_STORAGE_PATH}. Error: {e}"
        logger.critical(msg)
        print(msg)
        # CRASH THE APP AS REQUESTED IF STORAGE IS BROKEN
        raise RuntimeError(f"CRITICAL STORAGE FAILURE: Cannot write to {FINAL_STORAGE_PATH}. Halting startup.")


def get_hierarchical_path(card_type: str, part_type: str, date: datetime = None) -> str:
    """
    Generates a structured path: /archives/{CARD_TYPE}/{PART_TYPE}/{YYYY}/{MM}/
    """
    if not date:
        date = datetime.utcnow()
        
    safe_card = str(card_type).upper().replace(" ", "_")
    safe_part = str(part_type).split(" ")[0].upper() # Take first word e.g. "AVIONICS" from "AVIONICS SYSTEM"
    
    year = date.strftime("%Y")
    month = date.strftime("%m")
    
    # Construct Path (Absolute)
    full_path = os.path.join(STORAGE_BASE_DIR, safe_card, safe_part, year, month)
    return full_path

def ensure_directory(path: str):
    try:
        os.makedirs(path, exist_ok=True)
    except OSError as e:
        logger.error(f"STORAGE_ERROR: Failed to create directory {path}: {e}")
        raise e

def save_file_securely(relative_path_structure: str, filename: str, content: bytes) -> dict:
    """
    Saves file to storage with SHA-256 integrity check.
    
    :param relative_path_structure: Tuple or list of subfolders e.g. ("SERVICEABLE", "2026")
    :param filename: "report.pdf"
    :param content: Binary content
    :return: { "absolute_path": str, "checksum": str, "size": int }
    """
    # 1. Calculate Integrity Data
    checksum = hashlib.sha256(content).hexdigest()
    size = len(content)
    
    # 2. Resolve Path
    # Determine absolute directory
    if isinstance(relative_path_structure, str):
        # Passed a full path string? Not recommended but handled.
        if relative_path_structure.startswith("/"):
             save_dir = relative_path_structure
        else:
             save_dir = os.path.join(STORAGE_BASE_DIR, relative_path_structure)
    else:
        # Passed list of subfolders e.g. ["SERVICEABLE", "2026"]
        # Joins with STORAGE_BASE_DIR (/app/storage/archives)
        save_dir = os.path.join(STORAGE_BASE_DIR, *relative_path_structure)
        
    ensure_directory(save_dir)
    absolute_path = os.path.join(save_dir, filename)
    
    # 3. Write File
    try:
        with open(absolute_path, "wb") as f:
            f.write(content)
        
        # MANDATE LOGGING
        log_msg = f"LOG: Archivo guardado en: {absolute_path} (SHA: {checksum[:8]})"
        logger.info(log_msg)
        print(log_msg) # Force stdout for podman logs
        
    except Exception as e:
        logger.error(f"WRITE_ERROR: {e}")
        raise e
        
    return {
        "absolute_path": absolute_path,
        "checksum": checksum,
        "size": size
    }

def save_daily_snapshot(filename: str, content: bytes) -> dict:
    """
    Specialized saver for Daily Snapshots.
    Saves to /daily_snapshots/{YYYY}/{MM}/
    """
    now = datetime.utcnow()
    year = now.strftime("%Y")
    month = now.strftime("%m")
    
    save_dir = os.path.join(SNAPSHOT_ROOT, year, month)
    return save_file_securely(save_dir, filename, content)

class UnifiedArchiveService:
    """
    Servicio Único de Persistencia (UnifiedArchiveService)
    Centralizes all report storage logic to ensure persistence across all delivery methods.
    """
    BASE_PATH = Paths.STORAGE_ROOT

    @staticmethod
    def persist_report(file_content, filename, file_format, category, delivery_method="Download", date_obj=None):
        """
        Persists a report to disk and returns the absolute path.
        
        Args:
            file_content: Bytes of the file (or IO buffer).
            filename: Base filename.
            file_format: PDF, XLSX, etc.
            category: Report category (e.g., TOTAL_INVENTORY).
            delivery_method: 'Download' or 'Email'.
            date_obj: Optional datetime object for historical pathing.
            
        Returns:
            str: Absolute path to the saved file.
        """
        try:
            # Handle IO Buffer
            if hasattr(file_content, 'getvalue'):
                content_bytes = file_content.getvalue()
            else:
                content_bytes = file_content

            # 1. Structure Path
            if not date_obj:
                date_obj = datetime.utcnow()
                
            year = date_obj.strftime("%Y")
            month = date_obj.strftime("%m")
            
            safe_category = str(category).upper().replace(" ", "_")
            safe_method = str(delivery_method).capitalize() # Download / Email
            
            # /app/storage/archives/{delivery_method}/{category}/{year}/{month}/
            storage_dir = os.path.join(UnifiedArchiveService.BASE_PATH, safe_method, safe_category, year, month)
            
            # 2. Ensure Directory Exists
            os.makedirs(storage_dir, exist_ok=True)
            
            # 3. Construct Filename
            safe_ext = file_format.lower().replace(".", "")
            if not filename.lower().endswith(f".{safe_ext}"):
                filename = f"{filename}.{safe_ext}"
                
            full_path = os.path.join(storage_dir, filename)
            
            # 4. Industrial Logging
            logger.info(f"[ARCHIVE] Persistiendo reporte {file_format} en disco...")
            logger.info(f"[ARCHIVE] Destino: {full_path}")
            
            # 5. Write to Disk
            with open(full_path, "wb") as f:
                f.write(content_bytes)
                
            return full_path
            
        except Exception as e:
            logger.error(f"ERROR CRITICO [ARCHIVE]: Fallo persistiendo reporte: {e}")
            raise e

    @staticmethod
    def get_cached_path(filename, file_format, category, delivery_method="Download", date_obj=None):
        """
        Check for existing file in cache.
        Returns path if exists and valid, else None.
        """
        try:
            if not date_obj:
                date_obj = datetime.utcnow()
                
            year = date_obj.strftime("%Y")
            month = date_obj.strftime("%m")
            
            safe_category = str(category).upper().replace(" ", "_")
            safe_method = str(delivery_method).capitalize()
            
            storage_dir = os.path.join(UnifiedArchiveService.BASE_PATH, safe_method, safe_category, year, month)
            
            safe_ext = file_format.lower().replace(".", "")
            if not filename.lower().endswith(f".{safe_ext}"):
                filename = f"{filename}.{safe_ext}"
                
            full_path = os.path.join(storage_dir, filename)
            
            if os.path.exists(full_path) and os.path.getsize(full_path) > 0:
                logger.info(f"[ARCHIVE] Cache HIT: {full_path}")
                return full_path
                
            return None
        except Exception:
            return None
