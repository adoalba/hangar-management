#!/bin/bash
# TRIGGER DAILY SNAPSHOT
# Usage in Cron: 59 23 * * * /path/to/script/cron_daily_snapshot.sh

# 1. Define Paths (Adjust based on deployment)
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTAINER_NAME="hangar_backend"

# 2. Trigger Snapshot inside Container
echo "[$(date)] Triggering Daily Snapshot..."
podman exec $CONTAINER_NAME python3 /app/app/scripts/trigger_snapshot.py >> $PROJECT_DIR/backend/logs/cron_snapshot.log 2>&1

if [ $? -eq 0 ]; then
    echo "[$(date)] Snapshot Triggered Successfully."
else
    echo "[$(date)] ERROR: Failed to trigger snapshot."
    exit 1
fi
