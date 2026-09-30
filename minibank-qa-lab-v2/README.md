# MiniBank QA Lab 2.0

Laboratorio local para la **Actividad 2.2.2 — Creación de casos de prueba utilizando técnicas específicas**. Convierta el plan anterior en 8–10 casos, ejecútelos y entregue evidencia, reportes y trazabilidad en unos 45 minutos.

Esta carpeta contiene la versión 2.0. La versión 1.0 permanece en ../minibank-qa-lab.

## Ejecutar con Docker

Con Docker Desktop iniciado, desde esta carpeta:

```powershell
docker compose up --build
```

- Aplicación: http://localhost:5174
- Swagger: http://localhost:8001/docs
- Salud: http://localhost:8001/api/health

Los puertos difieren de 1.0 para permitir ambas versiones. Puede personalizarlos con BACKEND_PORT y FRONTEND_PORT antes de iniciar Compose. Los puertos internos siguen siendo 8000 y 5173.

```powershell
docker compose exec backend pytest -q
docker compose down
```

Los datos viven en memoria y se restauran al reiniciar el backend. No hay servicios externos, claves de API ni base de datos obligatoria.

## Ejecutar sin Docker (Windows)

Requiere Python 3.12 y Node 22. En una terminal, desde esta carpeta:

```powershell
python -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
cd backend
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

En otra terminal:

```powershell
cd frontend
npm ci
$env:API_URL="http://127.0.0.1:8001"
npm run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Tests locales desde backend:

```powershell
.venv/Scripts/python.exe -m pytest -q
```

## Datos y reinicio

| Dato | Valor |
|---|---|
| RUT cliente | 11.111.111-1 |
| Clave | 1234 |
| Saldo estándar | $2.000.000 |
| Comisión | $300 |
| Límite diario | $1.000.000 |
| Monto por transferencia | $1–$500.000 |
| RUT destinatario de ejemplo | 12.345.678-5 |

```powershell
Invoke-RestMethod -Method Post http://localhost:8001/api/reset
```

Reset limpia sesiones, movimientos, destinatarios y acumulado. Vuelva a iniciar sesión. Para preparar pruebas de saldo insuficiente, use /api/reset?perfil=saldo_bajo (saldo $500.000); sin parámetros siempre restaura el perfil estándar.

## API

| Método | Ruta |
|---|---|
| GET | /api/health |
| POST | /api/login |
| POST | /api/logout |
| GET | /api/cuenta |
| GET | /api/movimientos |
| GET / POST | /api/destinatarios |
| POST | /api/transferir |
| POST | /api/reset |

Use el esquema Bearer de Swagger tras iniciar sesión. Los requisitos de autorización están en el material del estudiante. El monto de la API es un número entero JSON.

## Material de la actividad

- [Guía del estudiante](student/GUIA_ESTUDIANTE.md)
- [Requisitos](student/REQUISITOS.md)
- [Plantilla de casos](student/PLANTILLA_CASOS.md)
- [Matriz de trazabilidad](student/MATRIZ_TRAZABILIDAD.md)
- [Reporte de defecto](student/REPORTE_DEFECTO.md)

Complete los resultados al ejecutar. La suite pública verifica operaciones básicas; el estudiante debe diseñar sus propios casos contra los requisitos.

