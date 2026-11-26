# Evaluación de seguridad — Atlas (EP3/EP5)

Vas a usar **Docker** para detectar problemas de seguridad en este laboratorio y
proponer cómo corregirlos. **No necesitas instalar herramientas ni saber PowerShell**:
solo ejecutas un comando por comprobación y **documentas lo que aparece en pantalla**.

> ⚠️ Solo puedes probar **tu propia instancia local**. No escanees sistemas de otros.

## Paso 1 — Levantar el laboratorio y el escáner

```
docker compose up --build -d --wait
docker compose --profile tools build
```

(La primera vez tarda unos minutos en descargar y construir.)

## Paso 2 — Las comprobaciones (un comando cada una)

```
docker compose run --rm escaner puertos
docker compose run --rm escaner cabeceras
docker compose run --rm escaner sqli
docker compose run --rm zap zap-baseline.py -t http://web -I -r reporte-zap.html
```

Si prefieres correr las tres primeras de una vez:

```
docker compose run --rm escaner todo
```

El informe de ZAP queda en la carpeta `evidencias/` (`reporte-zap.html`); ábrelo en
el navegador.

## Paso 3 — Qué estás observando

| Comando | Qué mira | Qué anotar |
|---|---|---|
| `escaner puertos` | Qué servicios quedan accesibles y su versión | ¿Hay algún servicio que **no debería** estar abierto? |
| `escaner cabeceras` | Qué información devuelve el servidor | ¿El servidor **revela su versión**? |
| `escaner sqli` | Si un parámetro de búsqueda es vulnerable | ¿La herramienta **confirma inyección SQL**? |
| `zap` | Cabeceras y cookies de seguridad | ¿**Falta** alguna protección (cabecera o cookie)? |

## Paso 4 — Entrega

Por cada hallazgo, una fila. Separa lo que **viste** de lo que **significa**:

| N° | Comando usado | Qué observé (evidencia) | Qué significa | Cómo se corrige |
|---|---|---|---|---|

Guarda las capturas o el texto de la consola y el `reporte-zap.html` como evidencia.

## Paso 5 — Cerrar

```
docker compose down
```
