
#!/usr/bin/env bash
# exit on error
set -o errexit

# --- 1. Instalar dependencias de Frontend y Construir ---
echo "Building Frontend..."
npm install
npm run build

# --- 2. Instalar dependencias de Python ---
echo "Installing Python dependencies..."
pip install -r requirements.txt

# --- 3. Migraciones o tareas adicionales (opcional) ---
# flask db upgrade
