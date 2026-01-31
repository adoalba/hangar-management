#!/bin/bash
set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}>>> [1/3] Deteniendo servicios antiguos...${NC}"
podman-compose down

echo -e "${YELLOW}>>> [2/3] Reconstruyendo imágenes (Build Clean)...${NC}"
podman-compose build

echo -e "${YELLOW}>>> [3/3] Iniciando contenedores en segundo plano...${NC}"
podman-compose up -d

echo -e "${GREEN}>>> [ÉXITO] Sistema Hangar Management Reiniciado.${NC}"
echo -e "${GREEN}>>> Frontend disponible en: http://localhost:8080 (Nginx)${NC}"
echo -e "${GREEN}>>> Backend disponible en:  http://localhost:5000${NC}"
echo -e "${YELLOW}>>> Para ver logs: podman-compose logs -f${NC}"
