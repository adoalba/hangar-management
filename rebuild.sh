#!/bin/bash
set -e

echo "🚀 INICIANDO PROTOCOLO DE RECONSTRUCCIÓN SRE (PODMAN)"
echo "==================================================="

# 1. PROTOCOLO DE RESETEO MAESTRO (CIRUGÍA DE KERNEL/RUNTIME)
echo "💀 [1/6] Eliminando contenedores, volúmenes y huérfanos (Clean Slate)..."
# Intentamos shutdown grácil con TIMEOUT estricto. Si se cuelga, matamos todo.
timeout 10s podman-compose down --volumes --remove-orphans || echo "⚠️  podman-compose down agotó tiempo, procediendo a eliminación forzada..."

# Kill switch masivo para procesos pegados
killall -9 podman conmon rootlessport slirp4netns 2>/dev/null || true

# Limpieza forzada de contenedores
timeout 10s podman rm -fa || true

# Limpieza profunda de sistema
podman system prune -f --volumes

# Eliminación NUCLEAR de volúmenes de datos (Fix Rol Admin)
echo "💀 [2.5/6] Buscando y eliminando TODOS los volúmenes del proyecto..."
# Borra cualquier volumen que contenga pgdata, postgres, hangar o db
volumes=$(podman volume ls -q | grep -E 'pgdata|postgres|hangar|db' || true)
if [ -n "$volumes" ]; then
    for vol in $volumes; do
        echo "   💥 Eliminando volumen: $vol"
        podman volume rm "$vol" --force || true
    done
else
    echo "   ✅ No se encontraron volúmenes residuales."
fi

echo "🔍 [DEBUG] Verificando lista de volúmenes restantes (Debe estar vacía de 'hangar'/'postgres'):"
podman volume ls

# Elimina redes, volúmenes y restos de construcción
podman system prune -f --volumes

echo "🔓 [3/6] Liberando bloqueos de Socket y Runtime..."
# Limpieza de archivos de bloqueo temporales que causan deadlocks
rm -f "$XDG_RUNTIME_DIR/libpod/tmp/events.sock" || true
rm -f "$XDG_RUNTIME_DIR/libpod/tmp/socket" || true
rm -f "$XDG_RUNTIME_DIR/containers/libpod-conmon*" || true

echo "reset_complete" > /dev/null

# 2. Corrección de Permisos
echo "🔧 [4/6] Aplicando corrección de permisos..."
if [ -f "backend/scripts/entrypoint.sh" ]; then
    chmod +x backend/scripts/*.sh
    echo "✅ Scripts del backend marcados como ejecutables (chmod +x)."
else
    echo "⚠️  ALERTA: No se encontraron scripts en backend/scripts/"
fi

# 3. Reconstrucción
echo "🏗️  [5/6] Construyendo imágenes (sin caché para asegurar frescura)..."
# Usamos --no-cache para evitar problemas con capas corruptas anteriores
podman-compose build --no-cache

# 4. Despliegue
echo "🚀 [6/6] Levantando servicios..."
# --in-pod false es CRÍTICO para que la comunicación entre contenedores funcione como en Docker
podman-compose up -d --in-pod false

echo "==================================================="
echo "✅ DESPLIEGUE COMPLETADO EXITOSAMENTE"
echo "   Frontend: http://localhost:8080"
echo "   Backend : http://localhost:8080/api/inventory"
echo "==================================================="
