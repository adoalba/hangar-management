
#!/bin/sh

# --- 1. PROTOCOLO DE ESPERA DE BASE DE DATOS ---
# Ejecuta el script que pausa el inicio hasta que la base de datos PostgreSQL
# esté lista para aceptar conexiones. Esto previene que Gunicorn falle al iniciar
# si el contenedor de la aplicación arranca más rápido que el de la base de datos.
echo "Iniciando secuencia de arranque del terminal..."
python wait-for-db.py

# --- 2. CREACIÓN DEL ESQUEMA DE BASE DE DATOS ---
# Ejecuta un script dedicado para crear todas las tablas si no existen.
# Este es el paso CRÍTICO que resuelve el error 'relation does not exist'.
echo "Garantizando la existencia del esquema de la base de datos..."
python init_db.py

# --- 3. INICIALIZACIÓN DE DATOS (ADMINISTRADOR) ---
# Una vez que la base de datos y las tablas están listas, se crea el usuario
# administrador inicial si no existe.
echo "Verificando/Creando identidad del administrador del sistema..."
python create_admin.py

# --- 4. INICIO DE SERVIDORES ---
# Iniciar Nginx en segundo plano para servir los archivos estáticos (frontend).
echo "Iniciando servidor web Nginx..."
nginx &

# Iniciar el servidor de la aplicación Python con Gunicorn.
# 'exec' reemplaza el proceso actual del shell con Gunicorn, convirtiéndolo en
# el proceso principal (PID 1) del contenedor. Esto asegura un manejo de señales
# limpio (ej. al detener el contenedor con `docker-compose down`).
echo "Iniciando servidor de aplicación Gunicorn..."
exec gunicorn --bind 127.0.0.1:5000 --workers 4 server:app
