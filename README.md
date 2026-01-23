<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Hangar Management - Terminal Operacional

Sistema de gestión de inventario y terminal operacional para aeronáutica, con soporte multi-biblioteca y consultoría mediante IA.

## Estructura del Proyecto

El proyecto está organizado en microservicios mediante contenedores:
- **Backend (Python/Flask)**: API REST, gestión de base de datos y lógica de negocio.
- **Frontend (React/Vite)**: Interfaz de usuario moderna y responsiva.
- **Nginx**: Proxy inverso para unificar el acceso y servir archivos estáticos.
- **Postgres**: Base de datos relacional para persistencia de datos.

## Inicio Rápido con Docker

La forma más sencilla de ejecutar el proyecto es usando Docker Compose:

```bash
docker-compose up --build
```

El sistema estará disponible en `http://localhost:8080`.

## Compatibilidad Multi-Plataforma (x64 / ARM)

El proyecto ha sido configurado para ser compatible con arquitecturas **Intel/AMD (x64)** y **Apple Silicon/Raspberry Pi (ARM)**.

### Construcción Multi-Arquitectura

Para construir imágenes para ambas arquitecturas simultáneamente y subirlas a un registro:

```bash
# Crear un builder de buildx si no tienes uno
docker buildx create --use

# Construir para ambas plataformas (ejemplo para el backend)
docker buildx build --platform linux/amd64,linux/arm64 -t tu-usuario/backend:latest ./backend --push
```

### Desarrollo Local en ARM (ej. Mac M1/M2/M3)
Docker Compose detectará automáticamente tu arquitectura y construirá las imágenes correspondientes sin necesidad de cambios adicionales.

## Tareas de Mantenimiento e Inicialización

Si necesitas esperar a que la base de datos esté lista antes de ejecutar scripts de migración o carga manual de datos, puedes usar el script de utilidad:

```bash
docker-compose exec api python scripts/wait-for-db.py
```

## Backups de Base de Datos

Para realizar un backup manual de la base de datos Postgres:

```bash
docker-compose exec api /app/scripts/backup.sh
```

Los backups se guardan en el volumen `app_backups` y se mantienen los últimos 7 días automáticamente.

## Logging y Monitoreo

El sistema utiliza logs estructurados con rotación automática:

- **Consola**: Puedes ver los logs en tiempo real con `docker-compose logs -f api`.
- **Archivos**: Los logs se persisten en el volumen `app_logs` dentro de `/app/logs/app.log`.
- **Rotación**: Se mantienen hasta 5 archivos de 10MB cada uno.
