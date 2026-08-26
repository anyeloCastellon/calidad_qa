# QA Shop Lab

Laboratorio local para la práctica de **pruebas funcionales y no funcionales**.

QA Shop es una tienda en línea con interfaz web y API REST. La actividad
consiste en verificar, mediante pruebas manuales diseñadas por el propio
equipo, si el sistema cumple los requisitos especificados y si puede ser
autorizado para producción.

Todo el laboratorio se ejecuta **localmente con Docker**. No requiere servicios
externos, base de datos externa ni conexión a Internet una vez construida la
imagen.

---

## Requisitos previos

- **Docker Desktop** (Windows/macOS) o **Docker Engine + Compose v2** (Linux)
- **Postman** (para las pruebas de API)
- Un navegador con herramientas de desarrollador

Comprobación:

```bash
docker compose version
```

---

## Arranque

Desde la raíz del proyecto:

```bash
docker compose up --build
```

La primera vez la construcción tarda algunos minutos. El servicio queda listo
cuando el contenedor aparece como `healthy`.

Para ejecutar en segundo plano:

```bash
docker compose up -d --build
```

Para detener:

```bash
docker compose down
```

---

## URLs

| Recurso | URL |
|---|---|
| Aplicación web | http://localhost:5000 |
| Estado del servicio | http://localhost:5000/api/health |
| Catálogo (API) | http://localhost:5000/api/products |
| Locust (perfil performance) | http://localhost:8089 |

---

## Datos precargados

| ID | Producto | Precio (CLP) | Stock |
|---:|---|---:|---:|
| 1 | Notebook Gamer | 850.000 | 15 |
| 2 | Mouse Gamer | 25.000 | 30 |
| 3 | Teclado Mecanico | 65.000 | 10 |
| 4 | Monitor 27 | 220.000 | 5 |
| 5 | Audifonos USB | 45.000 | 20 |

Usuarios del ambiente de pruebas:

| Correo | Contraseña | Perfil |
|---|---|---|
| cliente@example.com | cliente123 | cliente |
| admin@example.com | admin123 | administrador |

Cupón disponible: `DUOC10`

---

## API

| Método | Ruta |
|---|---|
| GET | `/api/health` |
| GET | `/api/products` |
| GET | `/api/products/<id>` |
| POST | `/api/carts` |
| GET | `/api/carts/<cart_id>` |
| POST | `/api/carts/<cart_id>/items` |
| DELETE | `/api/carts/<cart_id>/items/<item_id>` |
| POST | `/api/carts/<cart_id>/coupon` |
| POST | `/api/checkout` |
| POST | `/api/login` |
| GET | `/api/me` |
| GET | `/api/admin/orders` |
| GET | `/api/admin/stats` |
| GET | `/api/search?q=` |
| GET | `/api/reports/summary` |

Autenticación mediante cabecera `Authorization: Bearer <token>`.

Ejemplo rápido:

```bash
curl -s http://localhost:5000/api/health
curl -s -X POST http://localhost:5000/api/carts
curl -s -X POST http://localhost:5000/api/carts/1/items \
  -H "Content-Type: application/json" \
  -d "{\"product_id\":2,\"quantity\":2}"
```

---

## Postman

1. `File > Import` → `postman/QA-Shop-Lab.postman_collection.json`
2. Importar también `postman/QA-Shop-Lab.postman_environment.json`
3. Seleccionar el entorno **QA Shop Lab - Local**

La colección incluye las 16 peticiones del sistema con cuerpos de ejemplo.
No contiene validaciones automáticas: cada respuesta debe ser observada e
interpretada por el equipo de QA.

---

## Pruebas de carga

```bash
docker compose --profile performance up --build
```

Abrir **http://localhost:8089** y configurar:

| Campo | Valor sugerido |
|---|---|
| Number of users | 100 |
| Ramp up | 10 |
| Host | http://app:5000 |

Métricas a observar en la pestaña *Statistics*: requests/s, fallos, promedio,
mediana, percentil 95 y máximo.

El escenario está definido en `performance/locustfile.py`.

Para detener todo, incluido Locust:

```bash
docker compose --profile performance down
```

---

## Reiniciar la base de datos

La base SQLite vive en `data/qa_shop.db` y persiste entre reinicios de los
contenedores. Para volver al estado inicial:

**1.** Detener los contenedores:

```bash
docker compose down
```

**2.** Eliminar el archivo de base de datos:

```bash
rm data/qa_shop.db            # Linux / macOS / Git Bash
del data\qa_shop.db           # Windows CMD
Remove-Item data\qa_shop.db   # PowerShell
```

**3.** Levantar nuevamente:

```bash
docker compose up --build
```

La base se recrea y se puebla automáticamente con los productos, los usuarios y
el cupón.

---

## Estructura del proyecto

```
qa-shop-lab/
├── app/                    Aplicación Flask
│   ├── routes/             Endpoints de la API
│   ├── templates/          Vistas HTML
│   ├── static/             CSS y JavaScript
│   ├── config.py
│   ├── db.py
│   ├── models.py
│   └── seed.py
├── data/                   Base SQLite (generada al arrancar)
├── performance/            Escenario de carga para Locust
├── postman/                Colección y entorno de Postman
├── student/                Material para los estudiantes
├── Dockerfile
├── docker-compose.yml
├── entrypoint.sh
├── requirements.txt
└── wsgi.py
```

---

## Material del laboratorio

**Para el estudiante** (`student/`):

| Archivo | Contenido |
|---|---|
| `GUIA_ESTUDIANTE.md` | La misión, las fases de trabajo y las reglas |
| `REQUISITOS.md` | Los 8 requisitos funcionales y 5 no funcionales a verificar |
| `PLANTILLA_INFORME.md` | Formato del informe de pruebas a entregar |

El material de apoyo docente (planificación de la sesión, preguntas guía y
pauta de evaluación) se distribuye por separado y no forma parte de este
paquete.

---

## Notas técnicas

- Stack: Python 3.12, Flask, SQLite, Gunicorn, HTML/CSS/JavaScript sin frameworks.
- La aplicación se sirve con Gunicorn en el puerto 5000 del contenedor.
- El volumen `./data` mantiene la base entre reinicios.
- La variable de entorno `REPORT_SYNC_DELAY` ajusta el tiempo de consolidación
  del resumen de ventas.
- Si el puerto 5000 está ocupado, cambie el mapeo a `5001:5000` en
  `docker-compose.yml` y actualice `base_url` en Postman.
- El proyecto **no incluye pruebas automatizadas** de forma deliberada: el
  objetivo de esta actividad es que los casos de prueba sean diseñados por el
  estudiante. La automatización corresponde a una sesión posterior.
