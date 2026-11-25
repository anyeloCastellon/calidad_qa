# Mini-Blog QA — Automatización de pruebas (Actividad 3.3)

Plataforma mínima, hecha a medida, para practicar **pruebas automatizadas con
Selenium**. A diferencia de un CMS grande, aquí controlamos el HTML y cada
elemento tiene un **selector estable** (`id`), así que los scripts son
reproducibles.

Es una app **Flask + SQLite** (un solo lenguaje de punta a punta con las pruebas
en Python). También sirve para la parte de **revisión y mejora del código**: el
código es corto y legible.

## Flujos (los 3 de la guía)

| ID | Nombre | Qué valida | Ruta / selectores |
|---|---|---|---|
| AUT-01 | Login_Exitoso | Autenticación | `/login` → `#usuario`, `#clave`, `#btn-login` → `#dashboard` |
| AUT-02 | Crear_Entrada | Publicación de contenido | `/admin/nueva-entrada` → `#titulo`, `#cuerpo`, `#btn-publicar` |
| AUT-03 | Moderar_Comentario | Comentario + moderación | `/entrada/1` → `#comentario` → `/admin/comentarios` |

Credenciales de práctica: usuario `admin`, clave `Admin123`.

## 1. Levantar el laboratorio con Docker (recomendado)

Solo necesitas **Docker Desktop** corriendo. Un comando levanta el Mini-Blog y un
**Selenium Grid** con Chrome; no hay que instalar Python ni Chrome.

| Windows (PowerShell) | Linux / macOS |
|---|---|
| `.\lab.ps1 up` | `./lab.sh up` |
| `.\lab.ps1 test` | `./lab.sh test` |
| `.\lab.ps1 estado` | `./lab.sh estado` |
| `.\lab.ps1 reset` | `./lab.sh reset` |
| `.\lab.ps1 down` | `./lab.sh down` |

- **Mini-Blog:** http://localhost:5000
- **Ver el navegador mientras corren las pruebas:** http://localhost:7900
  (abre esa página y luego ejecuta `test`; verás a Selenium hacer los clics).
- `test` deja el reporte JUnit en `resultados/junit.xml`.
- `reset` reinicia la app con la base de datos limpia.

> La primera vez `up` descarga la imagen de Chrome (~1 GB); después es inmediato.

## 1B. Alternativa sin Docker (Python local)

```bash
cd selenium-lab
python -m venv .venv
. .venv/Scripts/activate        # Windows PowerShell:  .venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app/app.py               # queda en http://127.0.0.1:5000
```

Déjala corriendo en esa terminal.

## 2A. Probar con Selenium IDE (sin código)

1. Instala la extensión **Selenium IDE** (Chrome o Firefox).
2. Ábrela → *Open an existing project* → `mini-blog.side`.
3. Ejecuta la suite **Flujos clave 3.3**. Verde = pasó, rojo = falló.

## 2B. Probar con Selenium WebDriver (Python)

En **otra** terminal (con la app corriendo):

```bash
cd selenium-lab
. .venv/Scripts/activate
pytest -v                        # headless; usa SELENIUM_HEADED=1 para ver el navegador
```

Variables opcionales: `BLOG_URL`, `BLOG_USER`, `BLOG_PASS`.

## Tabla de evidencia para el informe

| ID Caso | Nombre del script | Herramienta | Resultado | Observaciones |
|---|---|---|---|---|
| AUT-01 | Login_Exitoso | Selenium IDE / WebDriver | Pass/Fail | Tiempo de ejecución |
| AUT-02 | Crear_Entrada | Selenium IDE / WebDriver | Pass/Fail | |
| AUT-03 | Moderar_Comentario | Selenium IDE / WebDriver | Pass/Fail | |

## Problemas comunes

- **`all predefined address pools have been fully subnetted`:** Docker se quedó sin
  rangos de red por redes viejas de otros proyectos. Ejecuta `docker network prune`
  (borra solo redes sin contenedores) y vuelve a correr `up`.
- **Puerto 5000 ocupado** (en macOS lo usa AirPlay): desactiva el "Receptor AirPlay"
  o detén lo que use ese puerto.

## Estructura

```
selenium-lab/
  lab.ps1 / lab.sh      lanzadera: up, test, estado, reset, down
  docker-compose.yml    app + Selenium Grid + servicio de pruebas
  Dockerfile
  app/
    app.py              Flask: rutas y lógica
    templates/          login, panel, nueva entrada, entrada, moderación
    blog.db             SQLite (se crea solo al arrancar)
  tests/
    conftest.py         fixture del driver headless
    test_flujos.py      AUT-01, AUT-02, AUT-03
  mini-blog.side        proyecto de Selenium IDE
  requirements.txt
```
