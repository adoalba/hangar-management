#!/bin/bash
# BACKUP STORAGE ARCHIVES
# Usage in Cron: 00 01 * * * /path/to/script/cron_backup_storage.sh

# 1. Define Paths
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STORAGE_DIR="$PROJECT_DIR/backend/storage"
BACKUP_DIR="$PROJECT_DIR/backend/backups"
DATE_STR=$(date +%Y%m%d)
ARCHIVE_NAME="storage_backup_$DATE_STR.tar.gz"

echo "[$(date)] Starting Backup of $STORAGE_DIR..."

# 2. Ensure Backup Directory Exists
mkdir -p $BACKUP_DIR

# 3. Compress
# We exclude the 'daily_snapshots' from the main archive if they are redundant, 
# but user said "backup storage folder". So we backup everything.
tar -czf "$BACKUP_DIR/$ARCHIVE_NAME" -C "$PROJECT_DIR/backend" storage

if [ $? -eq 0 ]; then
    echo "[$(date)] Backup Success: $BACKUP_DIR/$ARCHIVE_NAME"
    
    # Optional: Retention Policy (Delete older than 30 days)
    find "$BACKUP_DIR" -name "storage_backup_*.tar.gz" -mtime +30 -delete
else
    echo "[$(date)] ERROR: Backup Failed."
    exit 1
fi
