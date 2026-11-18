# Pipeline de seguridad (Actividad 3.2)

Este laboratorio trae un pipeline CI/CD que materializa el enfoque **Shift-Left /
DevSecOps** de la PPT 3.2.1 sobre el propio WordPress Security Lab, y conecta con
la actividad 3.2.2 (DAST con OWASP ZAP).

El workflow vive en la raíz del repositorio, en
[`.github/workflows/wordpress-lab-seguridad.yml`](../../.github/workflows/wordpress-lab-seguridad.yml),
porque GitHub Actions solo ejecuta workflows ubicados ahí (no dentro de subcarpetas).
Se dispara con cambios bajo `wordpress-security-lab/**` o manualmente
(*Run workflow*).

## Etapas del pipeline y su correspondencia con la PPT

| Etapa PPT 3.2.1 | Job del workflow | Herramienta | Qué revisa en este lab |
|---|---|---|---|
| Análisis de Seguridad — SAST | `sast` | semgrep | Patrones inseguros en el código del plugin (SQLi, eco sin escapar) |
| Análisis de Seguridad — Dependencias | `dependencias` | retire.js | Librerías de terceros vulnerables (jQuery 1.7.2) |
| Análisis de Seguridad — Secretos | `secretos` | gitleaks | Credenciales expuestas en el árbol de archivos |
| Testing dinámico — DAST | `dast` | OWASP ZAP (baseline) | Vulnerabilidades sobre la app en ejecución |

Cada control **reporta como artefacto** y **no rompe el build** (`continue-on-error`),
porque el laboratorio es vulnerable a propósito. Para convertir un control en una
**puerta de calidad** (filosofía *Fail Fast* de la PPT), quita su `|| true` en el
job correspondiente: el pipeline fallará cuando ese control encuentre hallazgos.

## DAST en el pipeline vs. DAST en clase

- **En clase (3.2.2):** el estudiante usa **ZAP Desktop (GUI)** con *Spider* +
  **Active Scan** apuntando a `http://localhost:8088`, y genera el informe HTML/JSON.
  El Active Scan **ataca activamente** (confirma SQLi y XSS).
- **En el pipeline:** se usa **ZAP baseline**, que es **pasivo** (spider + reglas
  pasivas). Es rápido y seguro para CI, y detecta cabeceras faltantes, cookies
  inseguras, la librería JS vulnerable y fugas de información. No "explota" SQLi/XSS;
  esa parte queda para el Active Scan manual.

## Qué evalúa la actividad 3.2

Además de la aplicación de la actividad 3.1.2, el laboratorio incluye una sección de
novedades (`/boletin/`) pensada para el análisis con ZAP. El objetivo del estudiante
es **descubrir e interpretar por su cuenta** las alertas que produce el escáner
(cabeceras, cookies, Anti-CSRF, XSS, librerías de terceros, redirecciones), no
recibir una lista de hallazgos.

El catálogo de hallazgos esperados y sus correcciones es **material docente privado**
y no se publica en este repositorio.

## Ejecutar los controles localmente (opcional)

```bash
# SAST
docker run --rm -v "$PWD:/src" semgrep/semgrep semgrep scan --config p/php --config p/security-audit /src/wordpress-security-lab/site

# Dependencias
npx --yes retire --path wordpress-security-lab/site

# Secretos
docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:latest detect --source=/repo/wordpress-security-lab --no-git

# DAST (con el laboratorio levantado con lab up)
docker run --rm --network wordpress-security-lab_lab -t ghcr.io/zaproxy/zaproxy zap-baseline.py -t http://gateway
```
