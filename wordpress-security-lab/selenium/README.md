# Automatización de pruebas (Actividad 3.3)

Flujos clave del portal Campus Abierto automatizados con Selenium. Dos formas,
alineadas con la guía 3.3.2:

- **Selenium IDE** (`campus-abierto.side`): el primer paso que pide la actividad.
- **Selenium WebDriver (Python)** (`webdriver/`): la mejora recomendada en la
  sección 5 de la guía (scripts más robustos y mantenibles).

## Casos

| ID | Nombre | Qué valida |
|---|---|---|
| AUT-01 | Login_Exitoso | Autenticación en el panel de administración |
| AUT-02 | Crear_Entrada | Publicación de una entrada (editor de bloques) |
| AUT-03 | Moderar_Comentario | Comentario público que queda en cola de moderación |

Credenciales de práctica (rol **editor**, puede entrar al panel, publicar y
moderar): usuario `redactor`, contraseña `Aula2026`. La entrada con comentarios
abiertos es `/bitacora-comunidad/`.

## Opción A — Selenium IDE

1. Instala la extensión **Selenium IDE** (Chrome o Firefox).
2. Ábrela → *Open an existing project* → `campus-abierto.side`.
3. Levanta el laboratorio (`.\lab.ps1 up`) y ejecuta la suite **Flujos clave 3.3**.
4. Exporta el log/relatorio para tu informe.

> El flujo AUT-02 usa el editor de bloques de WordPress. Los selectores pueden
> variar según la versión; si un paso falla, **regrábalo** (es lo que pide la
> actividad) y ajusta el selector.

## Opción B — Selenium WebDriver (Python)

Requisitos: Python 3.10+, Google Chrome instalado y el laboratorio levantado.
Selenium 4 descarga el driver automáticamente (Selenium Manager).

```bash
cd wordpress-security-lab/selenium/webdriver
python -m venv .venv
. .venv/Scripts/activate        # Windows PowerShell:  .venv\Scripts\Activate.ps1
pip install -r requirements.txt
pytest -v                        # headless; usa SELENIUM_HEADED=1 para ver el navegador
```

Variables de entorno opcionales: `CAMPUS_URL`, `CAMPUS_USER`, `CAMPUS_PASS`.

## Tabla de evidencia para el informe

| ID Caso | Nombre del script | Herramienta | Resultado | Observaciones |
|---|---|---|---|---|
| AUT-01 | Login_Exitoso | Selenium IDE / WebDriver | Pass/Fail | Tiempo de ejecución |
| AUT-02 | Crear_Entrada | Selenium IDE / WebDriver | Pass/Fail | |
| AUT-03 | Moderar_Comentario | Selenium IDE / WebDriver | Pass/Fail | |
