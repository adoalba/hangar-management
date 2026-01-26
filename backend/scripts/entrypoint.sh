#!/bin/bash
set -e

echo "================================================"
echo "  HANGAR MANAGEMENT - CONTAINER STARTUP"
echo "================================================"

# Wait for database to be ready
echo "[1/4] Waiting for PostgreSQL to be ready..."
python /app/scripts/wait-for-db.py

# Initialize database tables (idempotent - won't recreate existing)
echo "[2/4] Initializing database schema..."
python /app/scripts/init_db.py

# Create default admin if not exists
echo "[3/4] Checking admin user..."
python /app/scripts/create_admin.py || echo "Admin may already exist, continuing..."

echo "[4/4] Starting Gunicorn server..."
echo "================================================"

# Start Gunicorn
exec gunicorn \
    --bind 0.0.0.0:5000 \
    --workers 3 \
    --threads 2 \
    --timeout 60 \
    --access-logfile - \
    --error-logfile - \
    app.main:app
