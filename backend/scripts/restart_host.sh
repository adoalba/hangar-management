#!/bin/bash
set -e

# Resolve Project Root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
cd "$PROJECT_ROOT"

echo "📂 Working Directory set to: $(pwd)"

# CONSTANTS
PORT=5000
APP_MODULE="backend.app.main:app"
PID_FILE="/tmp/hangar_backend.pid"

echo "🛡️  SAFE BACKEND RESTART PROTOCOL"
echo "================================"

# 1. KILL EXISTING HOST PROCESSES
echo "🧹 [1/3] Searching for existing host processes..."
# Find PIDs using port 5000
PIDS=$(lsof -t -i:$PORT || true)

if [ ! -z "$PIDS" ]; then
    echo "   ⚠️  Found processes on port $PORT: $PIDS"
    echo "   🔪 Killing them forcefully..."
    kill -9 $PIDS || true
    sleep 2
else
    echo "   ✅ Port $PORT is free."
fi

# Double check for zombie gunicorn processes not on port yet or stuck
echo "   🧹 Sweeping specific gunicorn processes..."
pkill -f "gunicorn.*$APP_MODULE" || true
pkill -f "app.main:app" || true

# 2. STOP CONFLICTING CONTAINERS (Host mode priority)
echo "🐳 [2/3] Checking for conflicting containers..."
# If podman is running and mapping port 5000, stop it.
CONTAINER_NAMES=$(podman ps --format "{{.Names}} {{.Ports}}" | grep "5000" | awk '{print $1}' || true)

if [ ! -z "$CONTAINER_NAMES" ]; then
    for name in $CONTAINER_NAMES; do
         echo "   ⚠️  Found conflicting container: $name"
         podman stop $name
    done
    echo "   ✅ Containers checked."
fi

# 3. START NEW INSTANCE
echo "🚀 [3/3] Starting new Gunicorn instance..."
# Run in background but save PID
python3 -m gunicorn --bind 0.0.0.0:$PORT \
    --workers 3 \
    --threads 2 \
    --timeout 60 \
    --access-logfile - \
    --error-logfile - \
    $APP_MODULE --daemon

# Wait for startup
sleep 2

# Verify
NEW_PID=$(lsof -t -i:$PORT || true)
if [ ! -z "$NEW_PID" ]; then
    echo "✅ Backend STARTED successfully on PID: $NEW_PID"
    echo $NEW_PID > $PID_FILE
else
    echo "❌ FAILED to start backend. Check logs."
    exit 1
fi
