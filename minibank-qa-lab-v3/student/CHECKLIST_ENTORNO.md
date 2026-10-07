# Checklist del entorno

Complete antes del Smoke. Registre valores reales y la evidencia que los respalda.

| Campo | Registro |
|---|---|
| Fecha y hora | |
| Nombre del estudiante | |
| Equipo / hardware (CPU y RAM) | |
| Sistema operativo y versión | |
| Navegador y versión | |
| URL frontend | http://localhost:5175 |
| URL API / Swagger | http://localhost:8002 / http://localhost:8002/docs |
| Build observada | |
| Base de datos utilizada | |
| Archivo de DB | |
| Estado schema | |
| Estado seed / dataset base | |
| Scripts necesarios cargados; método de preparación | |
| Perfil inicial | |
| Docker disponible / versión | |
| Estado de servicios (`docker compose ps`) | |
| DevTools disponible | |
| Logs disponibles / origen | |
| Herramienta de captura disponible | |
| Casos previos disponibles / campaña seleccionada | |
| Adaptaciones previas de URL, build o precondición | |
| Evidencia de preparación | |
| Incidencias pendientes | |

Consulta de preparación: http://localhost:8002/api/lab/status. Registre `status`, `build`, `database`, `schema`, `seed` y perfil observado. Verifique los logs de inicialización con `docker compose logs backend`; la creación y carga inicial también pueden ejecutarse mediante los scripts documentados en el README.

## Preparación de estado

`POST /api/reset` y `POST /api/lab/reset` restauran el backend; el perfil `saldo_bajo` prepara saldo $500.000 y el perfil `estandar` saldo $2.000.000. Reset invalida las sesiones del backend. Registre el perfil y vuelva a ingresar si el caso requiere sesión.

**Reset del backend ≠ limpiar el navegador.** Las rutas de reset no borran `localStorage` del browser, **Authorize** de Swagger ni logs históricos. Prepare estas superficies explícitamente cuando las precondiciones del caso lo requieran. En los logs delimite la nueva ejecución por fecha/hora; no atribuya registros históricos a la build o caso actual.

La instalación de herramientas, descarga de imágenes y arranque inicial se completan antes del reloj. En los 0–7 minutos de la actividad se verifica y documenta la preparación.
