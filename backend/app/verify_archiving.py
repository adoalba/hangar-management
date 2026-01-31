
import os
import io
import logging
from datetime import datetime
try:
    from app.storage_service import UnifiedArchiveService
except ImportError:
    from storage_service import UnifiedArchiveService

# Configure logging to verify "Industrial Logging"
logging.basicConfig(level=logging.INFO)

def test_unified_archiving():
    print("--- TESTING UNIFIED ARCHIVE SERVICE ---")
    
    # 1. Test Data
    content = b"Test Report Content"
    filename = "test_persistence"
    file_format = "PDF"
    category = "VERIFICATION_TEST"
    date_obj = datetime.utcnow()
    
    # 2. Test Persistence (Download)
    print("\n[ACTION] Persisting Download...")
    path_download = UnifiedArchiveService.persist_report(content, filename, file_format, category, "Download", date_obj)
    print(f"[RESULT] Persisted to: {path_download}")
    
    if not os.path.exists(path_download):
        print("❌ FAIL: File not created.")
        exit(1)
    
    # 3. Test Persistence (Email)
    print("\n[ACTION] Persisting Email...")
    path_email = UnifiedArchiveService.persist_report(content, filename, file_format, category, "Email", date_obj)
    print(f"[RESULT] Persisted to: {path_email}")
    
    if not os.path.exists(path_email):
        print("❌ FAIL: File not created.")
        exit(1)
        
    # Check Structure
    if "/Download/" not in path_download:
        print("❌ FAIL: Wrong delivery method path for Download.")
        exit(1)
    if "/Email/" not in path_email:
         print("❌ FAIL: Wrong delivery method path for Email.")
         exit(1)

    # 4. Test Smart Cache
    print("\n[ACTION] Testing Cache Hit...")
    cached = UnifiedArchiveService.get_cached_path(filename, file_format, category, "Download", date_obj)
    if cached == path_download:
        print("✅ SUCCESS: Cache Hit verified.")
    else:
        print(f"❌ FAIL: Cache Miss or Wrong Path. Got: {cached}")
        exit(1)
        
    print("\n[ACTION] Testing Cache Miss...")
    cached_miss = UnifiedArchiveService.get_cached_path("non_existent", file_format, category, "Download", date_obj)
    if cached_miss is None:
        print("✅ SUCCESS: Cache Miss verified.")
    else:
         print(f"❌ FAIL: Should be None. Got: {cached_miss}")
         exit(1)

    print("\n--- ALL TESTS PASSED ---")

if __name__ == "__main__":
    test_unified_archiving()
