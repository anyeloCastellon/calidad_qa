# MiniBank QA Lab 3.0
## Operación: ¿liberamos esta versión?

**Actividad 2.3.2 — Ejecución de pruebas en un entorno de laboratorio. Trabajo individual: 45 minutos.**

En la actividad anterior diseñó los casos. Hoy no debe rediseñarlos: debe ejecutarlos exactamente como fueron definidos sobre la build **3.0.0-sast-lab** y recomendar si puede liberarse. Para la actividad de análisis estático y corrección, utilice `GUIA_SONARQUBE.md`.

**Preparación → Smoke → Ejecución → Evidencia → Defectos → Decisión**

Antes de iniciar el reloj, tenga Docker y las imágenes disponibles, MiniBank iniciado según el [README](../README.md), sus casos anteriores y estas plantillas abiertas. Con el docente, preseleccione una campaña manejable de **6–8 casos existentes** según riesgo y cobertura; es una recomendación de carga, no una cantidad de fallos requerida. Si no dispone de sus casos, solicite al docente su material de contingencia.

Conserve IDs, pasos, datos y resultados históricos. Abra un registro nuevo para esta build. Actualice antes de ejecutar las referencias de entorno: frontend `5175`, API `8002`, build y reset; registre la adaptación. Si un esperado anterior contradice los [requisitos vigentes](REQUISITOS.md), resuelva la discrepancia con el docente antes de la ejecución. No cambie pasos ni esperado después de observar el resultado.

## 0–7 min — Prepare y documente el entorno

Complete [CHECKLIST_ENTORNO.md](CHECKLIST_ENTORNO.md): equipo, SO, navegador/versiones, URLs, build, SQLite, schema/seed, scripts y herramientas.

```powershell
docker compose ps
docker compose logs backend
```

Consulte http://localhost:8002/api/lab/status; conserve evidencia del estado y de la build. Abra DevTools y prepare la captura de pantalla. Utilice el estado inicial o perfil de reset que indiquen las precondiciones de cada caso. Reset del backend no limpia el almacenamiento del navegador, la autorización de Swagger ni los logs históricos.

## 7–12 min — Ejecute el Smoke Gate

Ejecute los tres casos de [SMOKE_TEST.md](SMOKE_TEST.md), registre lo obtenido y conserve evidencia. No complete resultados por anticipado.

```text
3 PASS ──► Continúe con la campaña

Cualquier FAIL ──► STOP
                  └─► Casos dependientes: BLOCKED
```

Si falla el Smoke, detenga la ejecución de la campaña; registre la causa y el defecto. Utilice el tiempo restante para documentar el bloqueo y cerrar el informe. Un Smoke aprobado habilita la ejecución; la recomendación final necesita la evidencia de la campaña.

## 12–32 min — Ejecute los casos previos

Para cada caso seleccionado:

1. Prepare sus precondiciones y registre el perfil y estado inicial.
2. Siga exactamente los pasos y datos del caso anterior.
3. Compare esperado con obtenido, sin alterar el esperado.
4. Registre el obtenido y `PASS`, `FAIL`, `BLOCKED` o `NOT RUN` en [BITACORA_EJECUCION.md](BITACORA_EJECUCION.md).
5. Guarde evidencia tanto de los **PASS** como de los **FAIL**.

Puede usar captura de UI, DevTools → Network (método, URL, solicitud, estado HTTP y respuesta), Console, Application/Local Storage o `docker compose logs backend`, según el caso. Para la API use http://localhost:8002/docs. Tras login, pegue el token en **Authorize** sin prefijo `Bearer`; quite la autorización cuando la precondición exija una solicitud sin sesión.

Convención: `EV-001-SMK-001.png`, `EV-002-CP-TRF-003.png`, `EV-003-BUG-001.log`. Vincule cada archivo con el caso/build; oculte el valor de los tokens al compartir evidencias. Preserve los resultados de 2.0 como historial. No diseñe toda una suite nueva durante esta actividad.

## 32–40 min — Registre y reproduzca los defectos

Cada `FAIL`, incluido el del Smoke, debe vincularse a un reporte en [REPORTE_DEFECTO.md](REPORTE_DEFECTO.md): ID, caso/requisito, build, entorno, precondición, pasos, datos, esperado, observado, evidencia y reproducibilidad.

Si varios casos muestran exactamente el mismo defecto, utilice un único `BUG-XXX`, con las reproducciones y evidencias de cada caso. No duplique defectos para aumentar el conteo. Para repetir un fallo, restaure las precondiciones; registre los intentos y cuántos reprodujeron el resultado.

**Prioridad del caso** (`Alta / Media / Baja`) y **severidad del defecto** (`Crítica / Mayor / Menor / Cosmética`) son conceptos distintos. Fundamente la severidad en el impacto observado. No se exige encontrar un número fijo de fallos: cero `FAIL` es un resultado válido si está respaldado por ejecuciones y evidencias.

## 40–45 min — Informe y decisión de liberación

Complete [INFORME_RESUMEN.md](INFORME_RESUMEN.md). Separe Smoke de la campaña principal; indique qué quedó pendiente y por qué.

```text
Ejecutados = PASS + FAIL
Planificados = PASS + FAIL + BLOCKED + NOT RUN
```

Cuente defectos únicos, no filas fallidas. Elija `GO`, `NO-GO` o `GO CON CONDICIONES` y justifique en un máximo de tres líneas con evidencia, impacto y cobertura pendiente. Si propone condiciones, indique la corrección o comprobación necesaria antes de liberar.

Entregue checklist, registros Smoke, bitácora, evidencias, reportes de los fallos y resumen. No se solicita otro plan ni rediseñar los casos.
