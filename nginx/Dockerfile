# --- ETAPA 1: Construcción del Frontend ---
FROM node:18-alpine AS frontend-build

WORKDIR /app

# Instalación de dependencias
COPY frontend/package*.json ./
RUN npm install

# Construcción de la aplicación
COPY frontend/ ./
RUN npm run build

# --- ETAPA 2: Servidor de Producción (Nginx) ---
FROM nginx:alpine

# Opcional: Eliminar la configuración por defecto para evitar conflictos
RUN rm /etc/nginx/conf.d/default.conf

# Copiamos la configuración optimizada de Nginx
# El contexto de construcción es la raíz del proyecto
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Copiamos los archivos estáticos generados en la etapa anterior
COPY --from=frontend-build /app/dist /usr/share/nginx/html

EXPOSE 80

# Mantenemos el comando explícito para mayor claridad
CMD ["nginx", "-g", "daemon off;"]
