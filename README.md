# calidad_qa

Material de laboratorio para la asignatura de **Calidad de Software**.

## Actividades

### `qa-shop-lab/` — Pruebas funcionales y no funcionales

Laboratorio local, ejecutable con Docker, sobre una aplicación de comercio
electrónico con interfaz web y API REST. Los equipos reciben la aplicación y un
contrato de requisitos, y deben diseñar sus propios casos de prueba, ejecutarlos
con Postman, navegador y Locust, documentar los resultados y emitir una
recomendación sobre el paso a producción.

```bash
cd qa-shop-lab
docker compose up --build
```

Aplicación en http://localhost:5000 — ver [qa-shop-lab/README.md](qa-shop-lab/README.md)
para el detalle de arranque, API, datos precargados y pruebas de carga.

Material para los equipos en [`qa-shop-lab/student/`](qa-shop-lab/student):

| Documento | Contenido |
|---|---|
| `GUIA_ESTUDIANTE.md` | La actividad, sus fases y las reglas de trabajo |
| `PLANTILLA_INFORME.md` | Formato del informe de pruebas a entregar |

La especificación de requisitos a verificar se entrega durante la clase.

### `minibank-qa-lab/` — Plan de pruebas estratégico (Actividad 2.1.2)

Mini banca móvil (React + FastAPI) sobre la que cada estudiante diseña y
aplica un plan de pruebas: caja negra, caja blanca con complejidad ciclomática,
integración, análisis de flujo de datos, `pytest` y un asistente de QA con IA.

```bash
cd minibank-qa-lab
docker compose up --build
```

Aplicación en http://localhost:5173 — ver [minibank-qa-lab/README.md](minibank-qa-lab/README.md).
Guía en [`minibank-qa-lab/student/GUIA_ESTUDIANTE.md`](minibank-qa-lab/student/GUIA_ESTUDIANTE.md).

## Stack

Python 3.12 · Flask · SQLite · Gunicorn · Docker Compose · Postman · Locust

## Nota

El material de apoyo docente se distribuye por separado y no forma parte de
este repositorio.
