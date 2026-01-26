FROM node:18-alpine


WORKDIR /app

# Metadatos de construcción
ARG BUILD_DATE
LABEL org.opencontainers.image.created=$BUILD_DATE
LABEL org.opencontainers.image.title="Hangar Management Frontend"


COPY package*.json ./
RUN npm install

COPY . .

# Expone el puerto por defecto de Vite
EXPOSE 5173

# Ejecuta el servidor de desarrollo
CMD ["npm", "run", "dev", "--", "--host"]
