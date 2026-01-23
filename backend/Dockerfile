FROM python:3.11-slim

# Evita que Python genere archivos .pyc y asegura que los logs se muestren en tiempo real
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Dependencias del sistema
# Se incluyen build-essential, libpq-dev y gcc para compilar psycopg2 (necesario para compatibilidad x64/ARM)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    gcc \
    ca-certificates \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Instalación de dependencias de Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia del código fuente y scripts
COPY app/ ./app/
COPY scripts/ ./scripts/
RUN chmod +x ./scripts/*.sh

EXPOSE 5000

# Configuración de Gunicorn optimizada para producción
# Nota: Usamos app.main:app porque server.py fue renombrado a main.py
CMD ["gunicorn", \
    "--bind", "0.0.0.0:5000", \
    "--workers", "3", \
    "--threads", "2", \
    "--timeout", "60", \
    "app.main:app"]
