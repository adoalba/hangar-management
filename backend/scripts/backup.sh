#!/bin/bash

# Script de Backup para PostgreSQL en Docker
# Uso: docker-compose exec api /app/scripts/backup.sh

# Directorio de backups (mapeado a un volumen)
BACKUP_DIR="/app/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/db_backup_${TIMESTAMP}.sql"

# Crear directorio si no existe
mkdir -p "$BACKUP_DIR"

echo "[*] Iniciando backup de la base de datos..."

# Ejecutar pg_dump. DATABASE_URL debe estar disponible en el entorno
# Formato esperado: postgresql://user:pass@host:port/dbname
if [ -z "$DATABASE_URL" ]; then
    echo "[!] Error: DATABASE_URL no está definida."
    exit 1
fi

pg_dump "$DATABASE_URL" > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "[+] Backup completado con éxito: ${BACKUP_FILE}"
    # Mantener solo los últimos 7 días de backups
    find "$BACKUP_DIR" -name "db_backup_*.sql" -mtime +7 -delete
    echo "[*] Backups antiguos eliminados."
else
    echo "[!] Error al realizar el backup."
    rm -f "$BACKUP_FILE"
    exit 1
fi
