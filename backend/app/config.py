import os

class Paths:
    """
    IMMUTABLE PATH CONFIGURATION
    Principios de Invariabilidad de Producción.
    """
    # Base Application Directory
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    
    # Absolute Paths (Docker Standard with Dev Override)
    BASE_DIR = os.environ.get('BASE_DIR', "/app")
    DB_PATH = os.environ.get('DB_PATH', "/app/data/inventory.db")
    STORAGE_ROOT = os.environ.get('STORAGE_ROOT', "/app/storage/archives")
    LOG_FILE = os.environ.get('LOG_FILE', "/app/storage/logs/backend.log")
    LOG_DIR = os.environ.get('LOG_DIR', "/app/storage/logs")
    
    @classmethod
    def validate(cls):
        """
        Creates mandatory directories at startup.
        """
        # Ensure directories exist
        os.makedirs(os.path.dirname(cls.DB_PATH), exist_ok=True)
        os.makedirs(cls.STORAGE_ROOT, exist_ok=True)
        os.makedirs(cls.LOG_DIR, exist_ok=True)
        
        # Check permissions (basic check)
        if not os.access(cls.STORAGE_ROOT, os.W_OK):
             print(f"WARNING: No write access to {cls.STORAGE_ROOT}")

    @classmethod
    def verify_integrity(cls):
        """
        Alias for validate(), matching new industrial standard naming.
        """
        cls.validate()
