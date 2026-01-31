
import sys
import os

# Add /app to pythonpath
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.models import Base, engine, DATABASE_URL

def init():
    print(f"INITIALIZING DB AT: {DATABASE_URL}")
    try:
        Base.metadata.create_all(bind=engine)
        print("TABLES CREATED SUCCESSFULLY.")
        
        # Verify
        from sqlalchemy import inspect
        insp = inspect(engine)
        tables = insp.get_table_names()
        print(f"EXISTING TABLES: {tables}")
        
    except Exception as e:
        print(f"INIT FAILED: {e}")
        sys.exit(1)

if __name__ == "__main__":
    init()
