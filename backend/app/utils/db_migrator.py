import logging
from sqlalchemy import text
from ..database import SessionLocal

logger = logging.getLogger(__name__)

def check_and_migrate_db():
    """
    Checks for missing columns in the SQLite database and adds them if necessary.
    Specifically handles the transition to 'password_hash'.
    """
    session = SessionLocal()
    try:
        logger.info("MIGRATION: Checking database schema...")
        
        # Check if 'password_hash' column exists
        try:
            session.execute(text("SELECT password_hash FROM users LIMIT 1"))
            logger.info("MIGRATION: 'password_hash' column exists. No action needed.")
        except Exception:
            logger.warning("MIGRATION: 'password_hash' column missing. Applying migration...")
            
            # Add column
            session.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR"))
            session.commit()
            
            # Migrate data from legacy 'password' column if it exists
            try:
                # SQLite doesn't strictly check column existence in the same way, but let's try copy
                session.execute(text("UPDATE users SET password_hash = password WHERE password IS NOT NULL"))
                session.commit()
                logger.info("MIGRATION: Data migrated from 'password' to 'password_hash'.")
            except Exception as e:
                logger.warning(f"MIGRATION: Data migration failed (maybe 'password' col empty or missing): {e}")

        # Normalize Roles to lowercase
        logger.info("MIGRATION: Normalizing roles to lowercase...")
        session.execute(text("UPDATE users SET role = lower(role)"))
        session.commit()
        
    except Exception as e:
        logger.error(f"MIGRATION ERROR: {e}")
        session.rollback()
    finally:
        session.close()
