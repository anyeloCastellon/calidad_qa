# Selenium Lab — Automatización de pruebas (Actividad 3.3)

El laboratorio tiene **dos versiones**, ambas en http://localhost:5000:

| Versión | App | Comando | Para qué |
|---|---|---|---|
| 1 | **Mini-Blog QA** | `.\lab.ps1 up` | Primeros pasos: Selenium IDE y 3 flujos guiados |
| 2 | **TaskFlow QA** | `.\lab.ps1 up 2` | 5 casos para automatizar en clase con WebDriver ([ver abajo](#versión-2-taskflow-qa)) |

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

Un **gestor de tareas** con interfaz moderna. Tiene lo que aparece en las apps
reales y que hace interesante la automatización: listas desplegables, radios,
validaciones, búsqueda en vivo, cambios sin recargar la página, una ventana de
confirmación y avisos que desaparecen solos.

```powershell
.\lab.ps1 up 2        # levanta TaskFlow QA en http://localhost:5000
.\lab.ps1 test 2      # corre tus pruebas de tests2/
.\lab.ps1 reset 2     # vuelve a los datos iniciales
```

### Lo que hay que automatizar

Tu trabajo está en [`tests2/test_taskflow.py`](tests2/test_taskflow.py): cada caso
trae su enunciado y un `pytest.skip(...)` que debes reemplazar por tu código.
Al comienzo la suite muestra **5 skipped**; la meta es **5 passed**.

| ID | Caso | Qué verifica | Técnica de Selenium |
|---|---|---|---|
| V2-01 | Login | Clave incorrecta → mensaje de error. Clave correcta → tablero y saludo "Hola, Admin" | Casos negativos, `@pytest.mark.parametrize` |
| V2-02 | Crear tarea | Formulario vacío → "El titulo es obligatorio.". Tarea válida → aviso, aparece en Pendientes con su prioridad, contador +1 | `Select`, radio buttons, validaciones |
| V2-03 | Buscar y filtrar | "bug" deja solo una tarea; filtro "Alta" muestra solo prioridad Alta; texto inexistente → "No hay tareas…" | Esperas explícitas, contar elementos **visibles** |
| V2-04 | Completar tarea | La tarea pasa a Completadas, los contadores cambian, aparece el aviso | Contenido que cambia sin recargar (fetch) |
| V2-05 | Eliminar con modal | Cancelar no borra; Confirmar borra, avisa, y el aviso se va solo | Modales, esperar que algo **desaparezca** |

### Selectores

Todo elemento interactivo tiene un atributo **`data-testid`**: un identificador
pensado *solo* para pruebas, que no cambia aunque cambie el diseño. Se usa con CSS:

```python
from ayudas import sel                       # sel("buscar") -> '[data-testid="buscar"]'
driver.find_element(By.CSS_SELECTOR, sel("buscar"))
```

| Pantalla | `data-testid` |
|---|---|
| Login | `usuario`, `clave`, `btn-ingresar`, `login-error` |
| Barra superior | `saludo`, `nav-tablero`, `nav-nueva`, `btn-salir` |
| Nueva tarea | `titulo`, `descripcion`, `prioridad` (select), `categoria-trabajo` / `categoria-estudio` / `categoria-personal` (radios), `btn-guardar`, `error-titulo`, `error-prioridad`, `error-categoria` |
| Tablero | `contador-pendientes`, `contador-completadas`, `buscar`, `filtro-prioridad`, `resultados`, `sin-resultados`, `lista-pendientes`, `lista-completadas` |
| Cada tarea | `tarea` (con atributos `data-titulo` y `data-prioridad`), `tarea-titulo`, `tarea-prioridad`, `tarea-categoria`, `completar` (casilla), `eliminar` |
| Modal | `modal-confirmar`, `modal-tarea`, `cancelar-eliminar`, `confirmar-eliminar` |
| Avisos | `toast` |

Tip: para buscar una tarea concreta dentro de una columna,
`[data-testid="lista-pendientes"] [data-testid="tarea"][data-titulo="Corregir bug de login"]`.

### Reglas del juego

1. **Nada de `time.sleep()`**: usa la fixture `wait` con `expected_conditions`.
2. **Cada prueba se vale por sí misma**: hace su propio login y no depende de otra.
3. **Repetible**: tu suite debe pasar dos veces seguidas *sin* `reset`.
   Si una prueba crea o cambia datos, piensa cómo evitar que choque consigo misma.
4. **Sin aserción no hay prueba.** Y comprueba que tu aserción puede fallar.

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
  tests2/               plantilla de los 5 casos de la versión 2
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
