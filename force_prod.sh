#!/bin/bash
set -e

echo "🔒 FORCE PRODUCTION DEPLOYMENT PROTOCOL"
echo "======================================="

# 1. CLEANUP
echo "🧹 Cleaning old containers and images..."
podman stop hangar_frontend || true
podman rm hangar_frontend || true
podman rmi hangar_frontend_prod:latest || true

# 2. BUILD FRONTEND (EXPLICIT)
echo "🏗️  Building Frontend Production Image (hangar_frontend_prod:latest)..."
# Force build context to ensure Dockerfile is respected
podman build --no-cache -f frontend/Dockerfile -t hangar_frontend_prod:latest ./frontend

# 3. START compose
echo "🚀 Starting Services..."
podman-compose up -d

echo "✅ DONE. Access at http://localhost:8080"
