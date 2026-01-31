#!/bin/bash
set -e

echo "🔒 FORCE PRODUCTION DEPLOYMENT PROTOCOL"
echo "======================================="

# 1. CLEANUP (AGGRESSIVE & FORCEFUL)
echo "🧹 Cleaning old containers, pods and volumes..."

# 1.0 Identify and Kill Pods containing our containers (Crucial for "dependent container" errors)
# Get Pod IDs for any container with "hangar_" in the name
POD_IDS=$(podman ps -a --filter name=hangar_ --format "{{.Pod}}" | sort -u | grep -v "^\s*$")
if [ ! -z "$POD_IDS" ]; then
    echo "💣 Nuking Pods: $POD_IDS"
    echo "$POD_IDS" | xargs -r podman pod rm -f
fi

# 1.0.5 KILL HOST PROCESSES (Zombie Prevention)
echo "🧟 checking for host-based zombies (Gunicorn)..."
pkill -f "gunicorn.*app.main" || true
pkill -f "backend.app.main:app" || true
lsof -t -i:5000 | xargs -r kill -9 || true


# 1.1 Stop/Kill individual containers if they survived
podman ps -a --filter name=hangar_ --format "{{.ID}}" | xargs -r podman rm -f

# 1.2 Down via compose to clean networks (just in case)
podman-compose down || true
podman volume prune -f || true

# Remove old production image
podman rmi hangar_frontend_prod:latest || true

# 2. BUILD FRONTEND (EXPLICIT)
echo "🏗️  Building Frontend Production Image (hangar_frontend_prod:latest)..."
# Force build context to ensure Dockerfile is respected
podman build --no-cache -f frontend/Dockerfile -t hangar_frontend_prod:latest ./frontend

# 3. START compose
echo "🚀 Starting Services..."
podman-compose up -d

# 4. REFRESH PROXY (CRITICAL FOR 502 GATEWAY ISSUES)
# Nginx caches upstream IPs on startup. When frontend is recreated, its IP changes.
# We MUST restart Nginx to resolve the new IP address.
echo "🔄 Refreshing Proxy Configuration..."
podman restart hangar_nginx

echo "✅ DONE. Access at http://localhost:8080"
