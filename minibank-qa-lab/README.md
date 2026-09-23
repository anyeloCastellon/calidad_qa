# MiniBank QA Lab

Laboratorio para la **Actividad 2.1.2: Diseño de un plan de pruebas estratégico
con enfoque en calidad, riesgo y seguridad** (ISY1102).

MiniBank es una banca móvil deliberadamente pequeña: iniciar sesión, ver el
saldo y transferir. No intenta ser un banco real. Tiene justo lo necesario para
que haya algo concreto sobre lo que diseñar y ejecutar un plan de pruebas:

| Pieza | Para qué sirve en la actividad |
|---|---|
| Pantalla React | Caja negra: entrada → comportamiento → salida |
| `backend/app/transfer.py`, `rut.py` | Caja blanca: caminos, decisiones, bucles, complejidad ciclomática |
| API entre React y FastAPI | Enfoque híbrido: contrato, errores HTTP, sincronización de estado |
| Login, sesión y logs | Análisis de flujo de datos: credenciales, tokens, filtraciones |
| `backend/tests/` + `pytest` | Automatización y cobertura |
| Asistente de QA (OpenAI) | Contrastar casos humanos con casos propuestos por IA |

```
React (5173) ──POST /api/transferir──▶ FastAPI (8000) ──▶ validar_transferencia()
                                              │
                                              └──▶ OpenAI (opcional, solo desde el backend)
```

---

## Arranque con Docker

```bash
cd minibank-qa-lab
docker compose up --build
```

- Aplicación: http://localhost:5173
- API y documentación interactiva: http://localhost:8000/docs

### Si un puerto está ocupado

Los puertos normales son **5173** (frontend) y **8000** (backend). Si alguno
está en uso, cambie solo el lado izquierdo del mapeo en `docker-compose.yml`,
por ejemplo `"5174:5173"` o `"8001:8000"`, y abra la aplicación en el puerto
nuevo. No hace falta tocar nada más: dentro de Docker los servicios se siguen
hablando por los puertos internos.

## Arranque sin Docker

Requiere Python 3.12 y Node 20 o superior. En una terminal:

```bash
cd minibank-qa-lab/backend
python -m venv .venv
.venv\Scripts\activate          # Windows  (Linux/macOS: source .venv/bin/activate)
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

En otra terminal:

```bash
cd minibank-qa-lab/frontend
npm install
npm run dev
```

Si los puertos están ocupados sin Docker: inicie el backend con otro puerto
(`uvicorn ... --port 8001`) y el frontend con `API_URL` apuntando a él:

```bash
API_URL=http://localhost:8001 npm run dev -- --port 5174
```

(En PowerShell: `$env:API_URL="http://localhost:8001"; npm run dev -- --port 5174`.)

---

## Datos de prueba

| Dato | Valor |
|---|---|
| RUT cliente | `11.111.111-1` |
| Clave | `1234` |
| Saldo inicial | $500.000 |
| Límite diario de transferencias | $1.000.000 |
| Comisión por transferencia | $300 |
| RUT destinatarios válidos | `12.345.678-5`, `9.876.543-3`, `15.555.555-6` |

Los datos viven en memoria. Para volver al estado inicial:

```bash
curl -X POST http://localhost:8000/api/reset
```

o reinicie el backend. Los logs del backend se ven con `docker compose logs -f backend`.

---

## API

| Método | Ruta | Autenticación |
|---|---|---|
| GET | `/api/health` | — |
| POST | `/api/login` | — |
| POST | `/api/logout` | Bearer |
| GET | `/api/cuenta` | Bearer |
| POST | `/api/transferir` | Bearer |
| POST | `/api/ai/casos` | — |
| POST | `/api/reset` | — |

Cuerpo de `/api/transferir`:

```json
{ "destinatario": "12.345.678-5", "monto": 100000 }
```

---

## Pruebas automatizadas y complejidad

Con Docker, sin instalar nada más:

```bash
docker compose exec backend pytest -v
```

```bash
docker compose exec backend pytest --cov=app --cov-branch --cov-report=term-missing
```

```bash
docker compose exec backend radon cc app -s
```

`backend/tests/` está montado en el contenedor: los tests que se agreguen ahí
se ejecutan sin reconstruir la imagen. Sin Docker, los mismos comandos se
ejecutan desde `backend/` sin el prefijo `docker compose exec backend`.

`radon` calcula la complejidad ciclomática V(G) de cada función.

---

## Asistente de IA (opcional)

Sin configuración, el asistente responde en **modo sin conexión** con casos
genéricos. Para usar OpenAI:

```bash
cp backend/.env.example backend/.env
```

Complete `OPENAI_API_KEY` en `backend/.env` y reinicie el backend. El modelo se
elige con `OPENAI_MODEL`.

La clave **nunca** llega al navegador: React llama al backend y el backend
llama a OpenAI. `backend/.env` está excluido de git.

---

## Material

- [`student/GUIA_ESTUDIANTE.md`](student/GUIA_ESTUDIANTE.md): la actividad paso a paso
- [`student/PLANTILLA_PLAN.md`](student/PLANTILLA_PLAN.md): formato del plan a entregar
