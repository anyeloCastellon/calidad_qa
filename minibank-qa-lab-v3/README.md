# MiniBank QA Lab 3.0

Laboratorio local para la **Actividad 2.3.2 — Ejecución de pruebas en un entorno de laboratorio**. Evalúe la build candidata **3.0.0-rc1** utilizando los casos diseñados en la actividad anterior: prepare el entorno, ejecute Smoke y casos, conserve evidencia y emita una recomendación de liberación.

Tecnologías: React, FastAPI, SQLite y Docker Compose. Esta carpeta es independiente de MiniBank 1.0 y 2.0 y utiliza puertos diferentes.

## Arranque con Docker

Prepare Docker Desktop e imágenes antes de iniciar los 45 minutos de la actividad. Desde esta carpeta:

```powershell
docker compose up --build
```

Para ejecutar en segundo plano:

```powershell
docker compose up --build -d
docker compose ps
```

| Servicio | Dirección |
|---|---|
| Aplicación | http://localhost:5175 |
| Swagger | http://localhost:8002/docs |
| Estado del laboratorio | http://localhost:8002/api/lab/status |
| Salud de la API | http://localhost:8002/api/health |

```powershell
docker compose logs backend
docker compose exec backend pytest -q
docker compose down
```

La suite pública comprueba la preparación y las operaciones básicas. La evaluación funcional y no funcional se realiza con los casos del estudiante y sus evidencias.

## Arranque local en Windows

Requiere Python 3.12 y Node 22. En una terminal, desde esta carpeta:

```powershell
python -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
cd backend
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8002
```

En otra terminal, desde esta carpeta:

```powershell
cd frontend
npm ci
$env:API_URL="http://127.0.0.1:8002"
npm run dev -- --host 127.0.0.1 --port 5175 --strictPort
```

Tests locales, desde `backend`:

```powershell
.venv/Scripts/python.exe -m pytest -q
```

## Datos y persistencia

| Dato | Valor |
|---|---|
| Cliente | Camila Rojas |
| RUT | 11.111.111-1 |
| Clave del laboratorio | 1234 |
| Saldo estándar | $2.000.000 |
| Saldo del perfil `saldo_bajo` | $500.000 |
| Comisión | $300 |
| Límite diario | $1.000.000 |
| Monto por transferencia | $1–$500.000 |
| RUT destinatario de ejemplo | 12.345.678-5 |

SQLite se genera en `backend/data/minibank_v3.db`, con tablas `users`, `accounts`, `sessions`, `recipients` y `movements`. El primer arranque crea el esquema y carga el dataset; los posteriores conservan los datos bancarios. El arranque invalida las sesiones existentes: vuelva a ingresar. Reiniciar el backend conserva operaciones y acumulado; para iniciar una nueva jornada utilice reset.

`/api/lab/status` verifica el acceso real a la DB, las tablas y el dataset base. El estado esperado es `ready`, build `3.0.0-rc1`, database `sqlite`, schema `ready` y seed `loaded`.

## Reset del laboratorio

Desde Swagger o PowerShell:

```powershell
Invoke-RestMethod -Method Post http://localhost:8002/api/lab/reset
Invoke-RestMethod -Method Post "http://localhost:8002/api/lab/reset?perfil=saldo_bajo"
```

Para conservar las precondiciones de casos de MiniBank 2.0 se admiten también `POST /api/reset`, `POST /api/reset?perfil=estandar` y `POST /api/reset?perfil=saldo_bajo`.

Reset restaura cuenta, acumulado diario, destinatarios, movimientos, sesiones y secuencia de comprobantes. Sin perfil se utiliza `estandar`. Un perfil desconocido se rechaza sin modificar el estado. Después del reset vuelva a ingresar.

**Reset del backend no limpia el navegador ni los logs históricos.** Quite la autorización de Swagger y prepare el almacenamiento del navegador según las precondiciones de cada caso; no confunda estos pasos con restaurar SQLite.

Scripts de laboratorio disponibles, desde `backend`:

```powershell
.venv/Scripts/python.exe scripts/init_db.py
.venv/Scripts/python.exe scripts/seed_db.py
.venv/Scripts/python.exe scripts/reset_db.py --perfil estandar
.venv/Scripts/python.exe scripts/reset_db.py --perfil saldo_bajo
```

El arranque normal inicializa automáticamente la DB; los scripts permiten preparar el entorno de forma explícita. `reset_db.py` restaura el dataset del perfil indicado.

## API y material del estudiante

| Método | Ruta |
|---|---|
| GET | `/api/health`, `/api/lab/status` |
| POST | `/api/login`, `/api/logout` |
| GET | `/api/cuenta`, `/api/movimientos` |
| GET / POST | `/api/destinatarios` |
| POST | `/api/transferir` |
| POST | `/api/lab/reset`, `/api/reset` |

En Swagger, obtenga el token mediante login y use **Authorize** con el token sin el prefijo `Bearer`. El monto de la API se expresa como número entero JSON.

- [Guía del estudiante](student/GUIA_ESTUDIANTE.md)
- [Requisitos](student/REQUISITOS.md)
- [Checklist del entorno](student/CHECKLIST_ENTORNO.md)
- [Smoke Test](student/SMOKE_TEST.md)
- [Bitácora de ejecución](student/BITACORA_EJECUCION.md)
- [Reporte de defecto](student/REPORTE_DEFECTO.md)
- [Informe resumen](student/INFORME_RESUMEN.md)

Conserve los casos y resultados históricos de 2.0 y registre la nueva ejecución por build. Guarde sus evidencias localmente; la carpeta pública `student/evidencias/` contiene únicamente `.gitkeep`.
