# MiniBank — análisis y corrección con SonarQube

Use MiniBank 3.0, build **3.0.0-sast-lab**, como punto de partida para los ciclos **3.1 y 3.2**. Primero analice y documente la versión recibida; después corrija el código, compruebe su comportamiento y vuelva a analizarlo. Conserve la evidencia inicial para comparar los cambios.

Este laboratorio utiliza datos ficticios y se ejecuta localmente. Mantenga MiniBank y SonarQube accesibles desde `127.0.0.1`; no utilice datos reales ni publique la build de trabajo en Internet.

## 1. Prepare el análisis

Antes de comenzar:

- Tenga SonarQube iniciado en http://localhost:9000 y anote su versión.
- Prepare Python **3.12**, Node **22** y el scanner `pysonar` en su entorno de análisis.
- Cree o utilice el proyecto indicado por el docente. La clave sugerida es `minibank3`; si ya existe una clave configurada, utilice esa misma durante todos los ciclos.
- En **Quality Profiles**, verifique que el proyecto use **Sonar way** para Python, JavaScript y Docker. Registre los perfiles y la versión de los analizadores disponibles.
- Revise `sonar-project.properties`: `sonar.sources=backend,frontend,docker-compose.yml` incluye Python, JavaScript/React, Dockerfiles y Compose de V3, con `sonar.python.version=3.12`. `backend/tests` se registra como tests; datos, cachés, dependencias y archivos generados se delimitan mediante las exclusiones declaradas. `teacher/`, las evidencias y MiniBank 1.0/2.0 quedan fuera de este alcance.

El **Quality Profile** selecciona reglas; el **Quality Gate** evalúa condiciones sobre sus resultados. Son configuraciones diferentes. Mantenga los mismos perfiles y alcance entre ciclos para poder comparar. [Configuración de estándares de SonarQube](https://docs.sonarsource.com/sonarqube-community-build/user-guide/about-new-code).

Si el scanner todavía no está disponible, instálelo en el entorno Python de análisis:

```powershell
python --version
python -m pip install pysonar
pysonar --version
```

Registre las versiones utilizadas. No convierta tests, datos, dependencias descargadas o evidencia en fuentes productivas; la delimitación del alcance debe ser visible y consistente.

## 2. Analice MiniBank 3.0

Desde la raíz del repositorio, entre a la carpeta V3:

```powershell
Set-Location minibank-qa-lab-v3
```

Genere un token de análisis con permiso para el proyecto. Cárguelo en la variable de entorno de la terminal, sin escribirlo en archivos ni pasarlo como argumento del scanner:

```powershell
$scanSecret = Read-Host "Token de análisis de SonarQube" -AsSecureString
$env:SONAR_TOKEN = [System.Net.NetworkCredential]::new('', $scanSecret).Password
```

Ejecute el scanner **desde esta carpeta**, sustituyendo `CLAVE` por la clave del proyecto:

```powershell
pysonar --sonar-host-url=http://localhost:9000 --sonar-project-key=CLAVE --sonar-project-version=3.0.0-sast-lab
```

El scanner admite `SONAR_TOKEN` y toma la configuración de `sonar-project.properties`. Los comandos de esta guía usan opciones largas compatibles con PowerShell. [SonarScanner for Python](https://docs.sonarsource.com/sonarqube-server/analyzing-source-code/scanners/sonarscanner-for-python), [argumentos oficiales](https://github.com/SonarSource/sonar-scanner-python/blob/master/CLI_ARGS.md).

Al terminar, espere a que SonarQube complete la tarea de procesamiento. Abra el proyecto en el enlace que muestra el scanner; confirme que la fecha, versión y revisión corresponden al código que ejecutó. Una salida correcta del scanner no sustituye la confirmación de procesamiento del servidor.

Limpie el token de la terminal cuando termine la sesión de análisis:

```powershell
Remove-Item Env:SONAR_TOKEN
Remove-Variable scanSecret
```

No incluya el token en capturas, informes, archivos de configuración ni commits.

## 3. Documente los hallazgos reales

Abra **Issues** y **Measures**. Seleccione **Overall Code / código global** y examine los resultados de seguridad; no se limite a **New Code / código nuevo**. Separe las incidencias de seguridad de las de confiabilidad y mantenibilidad. Registre el conteo observado, sin completar resultados por anticipado.

Conserve una captura o exportación del análisis inicial con fecha, versión de proyecto, revisión, alcance, perfiles y conteos. Examine cada hallazgo en su contexto: regla, ubicación, entradas, comportamiento y consecuencias. SonarQube aporta una señal que debe evaluarse junto con las pruebas del laboratorio.

La clasificación depende del servidor y su modo. Si muestra **Vulnerability** o una incidencia con impacto **Security**, registre esa clasificación. Un hallazgo con etiqueta `former-hotspot` se registra tal como aparece en la instancia. Si la versión mantiene una pestaña **Security Hotspots**, revísela por separado: un hotspot requiere evaluación de contexto y no se cuenta automáticamente como una vulnerabilidad confirmada. [Evolución del modelo de seguridad](https://www.sonarsource.com/products/sonarqube/whats-new/2026-5/), [distinción de hotspots en versiones anteriores](https://docs.sonarsource.com/sonarqube-server/9.8/user-guide/security-hotspots).

Duplique esta ficha por hallazgo:

| Campo | Registro |
|---|---|
| ID local / ID de SonarQube | |
| Regla y clasificación del servidor | |
| Archivo y línea del análisis inicial | |
| Versión, revisión y fecha inicial | |
| Riesgo y condición que lo hace relevante | |
| Impacto observado o razonado | |
| Recomendación de corrección | |
| Cambio realizado y versión 3.1 / 3.2 | |
| Evidencia inicial | |
| Prueba de comportamiento tras el cambio | |
| Evidencia y resultado del nuevo análisis | |

No hay una lista pública de respuestas. Justifique cada conclusión con el código, la regla y la evidencia; no declare un conteo de vulnerabilidades que no haya comprobado en la instancia utilizada.

## 4. Corrija y reanalice por ciclos

```text
3.0: analizar → documentar el punto de partida
                         ↓
3.1: priorizar → corregir → probar → reanalizar
                         ↓
3.2: revisar pendientes → corregir → probar → reanalizar
```

Conserve la revisión original de 3.0. Trabaje en la rama o copia de corrección indicada por el docente; registre qué hallazgos aborda cada ciclo. Mantenga la carpeta `minibank-qa-lab-v3` y la misma clave de proyecto; no sobrescriba el historial del punto de partida. Cambie el comportamiento inseguro y explique por qué la corrección reduce el riesgo.

Antes de construir cada versión corregida, actualice sus metadatos reales:

| Ubicación | Actualización por ciclo |
|---|---|
| `backend/app/db.py` | `VERSION` y `BUILD`: `3.1.0` en el primer ciclo; `3.2.0` en el siguiente. |
| `frontend/package.json` y `frontend/package-lock.json` | Versión `3.1.0` o `3.2.0`, manteniendo ambos archivos sincronizados. |
| Etiquetas de build en `frontend/src/App.jsx` y `frontend/src/Login.jsx` | Mostrar la build que está ejecutando y probando. |
| `sonar-project.properties` | `sonar.projectVersion` igual a la build corregida; conservar clave, perfiles, alcance y exclusiones. |
| `backend/tests/test_smoke.py`, caso `test_health_y_build` | Actualizar únicamente la identidad esperada de versión/build para `3.1.0` o `3.2.0`; mantener intactas las comprobaciones de comportamiento, autenticación, cuenta y reset. |

Desde `frontend`, `npm version 3.1.0 --no-git-tag-version` actualiza la versión del paquete y su lockfile; use `3.2.0` para el siguiente ciclo. Esto no sustituye los cambios de build del backend y de las etiquetas de UI.

Reconstruya/reinicie la aplicación después de cambiar el código. Compruebe que `/api/lab/status`, la UI y los metadatos del análisis identifican la misma build. No basta con cambiar la versión enviada al scanner si la aplicación sigue identificándose como 3.0.

Después de cada conjunto de cambios, vuelva a levantar la aplicación y ejecute las comprobaciones de comportamiento y las pruebas relevantes. Confirme login, cuenta, persistencia y reset; también las operaciones afectadas por sus cambios. Un análisis estático favorable no demuestra por sí solo que la aplicación sigue funcionando.

Desde V3, con `SONAR_TOKEN` cargado, mantenga la misma clave y alcance:

```powershell
pysonar --sonar-host-url=http://localhost:9000 --sonar-project-key=CLAVE --sonar-project-version=3.1.0
```

En el siguiente ciclo:

```powershell
pysonar --sonar-host-url=http://localhost:9000 --sonar-project-key=CLAVE --sonar-project-version=3.2.0
```

Espere el procesamiento del servidor y compare la evidencia con el análisis anterior. En cada ficha indique cuáles hallazgos desaparecieron por corrección, cuáles continúan y si aparecieron nuevos. Registre el ciclo, la build de MiniBank, la revisión del código y la versión del análisis que realmente probó.

## 5. Criterios de cierre

Para recomendar el cierre de la corrección:

- El análisis final corresponde a la revisión entregada, con alcance y perfiles conservados.
- Las **incidencias de seguridad activas en Overall Code son cero**; no basta con cero en New Code ni con una calificación visual favorable.
- Si existen Security Hotspots separados, están revisados con evidencia y los riesgos reales corregidos.
- Cada corrección tiene evidencia inicial, cambio trazable, prueba de comportamiento y reanálisis.
- No se han agregado supresiones, desactivado reglas o excluido módulos productivos para ocultar hallazgos. Tampoco se han cerrado como aceptados o falsos positivos únicamente para reducir la cifra. Una discrepancia real requiere justificación y revisión del docente.
- Las pruebas de comportamiento relevantes pasan y el informe explica los límites de cobertura y riesgos pendientes.

Un **Quality Gate aprobado no equivale a seguridad total**. Sus condiciones pueden enfocarse en código nuevo; revise también el código global. Incluso un conteo estático de cero conserva los límites del analizador y de las pruebas realizadas. [Quality Gates](https://docs.sonarsource.com/sonarqube-community-build/quality-standards-administration/managing-quality-gates/introduction-to-quality-gates), [métricas de seguridad](https://docs.sonarsource.com/sonarqube-community-build/user-guide/code-metrics/metrics-definition).

Entregue fichas de hallazgos, cambios por ciclo, evidencias de análisis inicial y final, resultados de pruebas y una recomendación fundada. El objetivo es corregir el producto y demostrarlo con evidencia comparable.
