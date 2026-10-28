# Campus Abierto — Actividad 3.1.2

WordPress local para una clase de 90 minutos: 60 de práctica guiada y 30 de desafío individual. Contiene fallos deliberados y datos ficticios. El alcance autorizado es exclusivamente este laboratorio local.

## Preparación antes de clase

Requiere Docker con Compose e Internet para descargar y construir las imágenes una vez. La descarga y construcción se realizan antes del bloque de 90 minutos.

En PowerShell, desde esta carpeta:

```powershell
.\ops\setup.ps1
docker compose --profile tools build
docker compose up -d --wait
docker compose logs init
.\ops\comprobar.ps1
```

En Linux/macOS, sustituye el primer comando por `sh ops/setup.sh`.

Aplicación: [http://localhost:8088](http://localhost:8088).
Comprobación de preparación: [estado](http://localhost:8088/wp-json/campus/v1/status), con `status: ready`. Si `init` aún está preparando los datos, espera a que termine y vuelve a comprobar.

| Cuenta de estudiante | Contraseña ficticia |
|---|---|
| `estudiante.uno` | `EstudianteUno!2026` |
| `estudiante.dos` | `EstudianteDos!2026` |

Las claves de administración y base de datos se generan en `.env`; se conservan localmente.

## Código disponible para revisión

- `site/wordpress/`: distribución completa de WordPress 7.1.3 y su licencia.
- `site/plugin/`: funciones del portal Campus Aula.
- `site/theme/`: tema Campus Abierto.
- `docker/` y `docker-compose.yml`: construcción, inicialización y herramientas.

El núcleo utilizado al construir el entorno proviene del código de esta carpeta. La configuración local, las bases de datos y las evidencias no forman parte del código versionado.

## Material para entregar

- [Clase guiada de 60 minutos](student/guias/Clase_guiada_312.pdf).
- [Desafío individual de 30 minutos](student/guias/Desafio_individual_312.pdf).

También están disponibles en el navegador: [clase guiada](http://localhost:8088/material/clase-guiada.html) y [desafío](http://localhost:8088/material/desafio.html). Cada equipo trabaja con su propia instancia Docker.

El apunte de clase contiene el itinerario y la bitácora; el profesor presenta las demostraciones y los comandos de WPScan y SQLMap durante la sesión. El desafío proporciona objetivos y entregables. Las resoluciones y la pauta docente no se publican. Las evidencias que genere el estudiante se guardan en `student/evidencias/`, excluido de Git y del servidor web.

## Operación del laboratorio

Restaurar solo los datos y las cuentas ficticias de Campus Abierto después de guardar las evidencias:

```sh
docker compose run --rm wpcli eval-file /opt/lab/reset.php
```

Se borran los mensajes del muro, se restauran recursos e inscripciones y se invalidan las sesiones de las cuentas de práctica. No se elimina ningún volumen de los demás proyectos.

Detener y volver a iniciar conserva el contenido:

```sh
docker compose down
docker compose up -d --wait
```

WordPress, MariaDB y las herramientas comparten una red Docker interna sin salida a Internet. Un proxy publica únicamente `127.0.0.1:8088`; WordPress y la base de datos no publican puertos. Los comandos dentro de las herramientas usan `http://wordpress`, mientras el navegador del equipo usa `http://localhost:8088`. No conectes este laboratorio a una red pública.

La base de identificación de WPScan se prepara al construir su imagen. Sin un token de su API, WPScan no entrega todo el catálogo de vulnerabilidades conocidas; enumerar componentes no demuestra un CVE ni confirma que el sitio sea seguro. No se necesita un token para seguir esta práctica.
