# Selenium Lab — Automatización de pruebas (Actividad 3.3)

El laboratorio tiene **dos versiones**, ambas en http://localhost:5000:

| Versión | App | Comando | Para qué |
|---|---|---|---|
| 1 | **Mini-Blog QA** | `.\lab.ps1 up` | Primeros pasos: Selenium IDE y 3 flujos guiados |
| 2 | **TaskFlow QA** | `.\lab.ps1 up 2` | App con diseño real: 5 casos para automatizar en clase con Selenium IDE ([ver abajo](#versión-2-taskflow-qa)) |

Solo corre una a la vez: `up 2` detiene la versión 1 y viceversa.

## Versión 1: Mini-Blog QA

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

Agrega `2` al final para trabajar con la versión 2.

| Windows (PowerShell) | Linux / macOS | Qué hace |
|---|---|---|
| `.\lab.ps1 up` · `.\lab.ps1 up 2` | `./lab.sh up` · `./lab.sh up 2` | Levanta la versión 1 o 2 y el Selenium Grid |
| `.\lab.ps1 test` · `.\lab.ps1 test 2` | `./lab.sh test [2]` | Corre la suite de esa versión |
| `.\lab.ps1 reset` · `.\lab.ps1 reset 2` | `./lab.sh reset [2]` | Reinicia la app con los datos iniciales |
| `.\lab.ps1 estado` | `./lab.sh estado` | Qué versión está arriba y si responde |
| `.\lab.ps1 logs [2]` | `./lab.sh logs [2]` | Registro de la app |
| `.\lab.ps1 down` | `./lab.sh down` | Apaga todo |

Sin número, `test`, `reset` y `logs` usan la versión que esté corriendo.

- **App:** http://localhost:5000 (`admin` / `Admin123` en ambas versiones)
- **Ver el navegador mientras corren las pruebas:** http://localhost:7900
  (abre esa página y luego ejecuta `test`; verás a Selenium hacer los clics).
- `test` deja el reporte JUnit en `resultados/junit-v1.xml` o `junit-v2.xml`.

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

1. Usa **Firefox**: la extensión oficial ya no está en la Chrome Web Store.
   En addons.mozilla.org busca **Selenium IDE** y elige la publicada por
   **Selenium** (logo azul "Se"); hay copias con el mismo nombre.
2. Ábrela → *Open an existing project* → `mini-blog.side`.
3. Ejecuta `reset` para partir con datos limpios.
4. Cambia *Tests* → **Test suites**, elige **Flujos clave 3.3** y presiona
   **Run all tests in suite**. Verde = pasó, rojo = falló.

> En Firefox reciente el comando `type` de Selenium IDE falla
> (`initKeyEvent is not a function`). Por eso el proyecto escribe en los campos
> con `executeScript` (`document.getElementById("usuario").value = "admin";`).
> Si grabas tus propios tests con **REC**, reemplaza los `type` de la misma forma.

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

## Versión 2: TaskFlow QA

Un **gestor de tareas** con diseño moderno, como los que se usan en el trabajo.
Aquí ya no te damos el proyecto hecho: **tú automatizas los flujos con Selenium
IDE** (Firefox), igual que en la versión 1 pero desde cero.

```powershell
.\lab.ps1 up 2        # levanta TaskFlow QA en http://localhost:5000
.\lab.ps1 reset 2     # vuelve a los datos iniciales (hazlo antes de correr tu suite)
```

Cuenta: `admin` / `Admin123`. URL base para Selenium IDE: `http://127.0.0.1:5000`

### Los 5 casos a automatizar

Cada caso es algo que un usuario real hace. Grábalo, corrígelo y agrega las
**aserciones** que demuestran que funcionó.

| ID | Historia de usuario | Debe verificar |
|---|---|---|
| CP-01 | *Como usuario, quiero iniciar sesión para ver mis tareas.* | El saludo "Hola, Admin", que estoy en "Mis tareas" y los contadores (5 pendientes, 2 completadas) |
| CP-02 | *Como usuario, quiero crear una tarea con prioridad y categoría.* | Título "Preparar demo de Selenium", prioridad **Alta**, categoría **Estudio** → aviso "Tarea creada correctamente.", la tarea aparece en **Pendientes** y el contador sube |
| CP-03 | *Como usuario, quiero buscar y filtrar mis tareas.* | Buscar "bug" → un solo resultado, "Corregir bug de login". Luego filtrar **Baja** → aparecen tareas Baja y **no** aparecen tareas de otra prioridad |
| CP-04 | *Como usuario, quiero marcar una tarea como completada.* | "Estudiar selectores CSS" pasa a **Completadas**, aviso "Tarea completada." y el contador cambia |
| CP-05 | *Como usuario, quiero eliminar una tarea, con confirmación.* | Eliminar "Actualizar documentación": primero **Cancelar** (la tarea sigue), luego **Confirmar** → aviso "Tarea eliminada." y la tarea ya no existe |

Al final arma una suite **Regresión TaskFlow** con los 5 casos, ejecuta
`.\lab.ps1 reset 2` y córrela completa: deben quedar los 5 en verde.

### Comandos de Selenium IDE que vas a necesitar

| Para… | Command | Ejemplo de Target / Value |
|---|---|---|
| Abrir una página | `open` | `/login` |
| Escribir en un campo | `execute script` | `document.getElementById("titulo").value = "Mi tarea";` |
| Elegir en una lista | `select` | Target `id=prioridad` · Value `label=Alta` |
| Clic (botón, enlace, radio) | `click` | `id=btn-guardar` |
| Verificar un texto | `assert text` | Target `id=saludo` · Value `Hola, Admin` |
| Verificar que algo existe | `assert element present` | `id=tarea-4` |
| Verificar que algo **no** existe | `assert element not present` | `id=tarea-4` |
| Esperar una ventana emergente | `wait for element visible` | Target `id=modal-confirmar` · Value `5000` |

> En Firefox reciente el comando `type` falla (`initKeyEvent is not a function`):
> cámbialo por `execute script`, como en la versión 1.

### Tips

- Todo elemento importante tiene un **`id`** fijo (lo verás con clic derecho →
  *Inspeccionar*). Prefiere siempre `id=` en el Target.
- Para encontrar una tarea por su título dentro de una columna:
  `xpath=//div[@id='lista-pendientes']//h3[text()='Corregir bug de login']`
- Cada caso debe **empezar con `open /logout`** y hacer su propio login: así no
  depende de lo que dejó el caso anterior.
- Los botones de cada tarea llevan el número de la tarea (`completar-3`,
  `eliminar-4`). Ese número depende de los datos: por eso se corre `reset 2`.
- Haz fallar cada aserción a propósito una vez: si nunca falla, no está probando nada.
- `.\lab.ps1 test 2` corre solo una prueba de humo (que la app esté arriba).

## Problemas comunes

- **`all predefined address pools have been fully subnetted`:** Docker se quedó sin
  rangos de red por redes viejas de otros proyectos. Ejecuta `docker network prune`
  (borra solo redes sin contenedores) y vuelve a correr `up`.
- **Puerto 5000 ocupado** (en macOS lo usa AirPlay): desactiva el "Receptor AirPlay"
  o detén lo que use ese puerto.

## Estructura

```
selenium-lab/
  lab.ps1 / lab.sh      lanzadera: up [2], test [2], estado, reset [2], down
  docker-compose.yml    app (v1), app2 (v2), Selenium Grid y servicios de pruebas
  Dockerfile
  app2/                 TaskFlow QA (versión 2): app.py, templates/, static/
  tests2/               prueba de humo de la versión 2
  pytest.ini            `pytest` a secas corre la versión 1
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
