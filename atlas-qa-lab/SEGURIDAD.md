# Evaluación de seguridad — Atlas (EP3/EP5)

Pruebas de seguridad sobre **este laboratorio local**. El objetivo es **identificar
vulnerabilidades** con herramientas y **proponer su mitigación**.

> ⚠️ Alcance autorizado: exclusivamente `http://localhost:5180` y `127.0.0.1` de tu
> propia instancia. No escanees ni pruebes sistemas de terceros.

## 1. Preparar el entorno y las herramientas

```powershell
cd atlas-qa-lab
./ops/setup.ps1
docker compose up --build -d --wait
docker compose --profile tools build
```

Quedan disponibles tres herramientas dentro de Docker (perfil `tools`):

| Herramienta | Para qué | Invocación |
|---|---|---|
| **nmap** | Descubrir puertos y servicios expuestos y sus versiones | `docker compose run --rm nmap -sV host.docker.internal -p <puertos>` |
| **sqlmap** | Probar parámetros de la API en busca de inyección SQL | `docker compose run --rm sqlmap -u "<url>" -H "Authorization: Bearer <token>" -p <param> --batch` |
| **OWASP ZAP** | Escaneo pasivo (*baseline*): cabeceras, cookies, divulgación | `docker compose run --rm zap zap-baseline.py -t http://web -I -r reporte-zap.html` |

Cuentas de prueba: `admin.atlas`, `editor.atlas`, `admin.sur` · clave `AtlasDemo!2026`.
Para las pruebas autenticadas obtén un token con `POST /api/auth/login`.

## 2. Qué investigar

1. **Superficie de red.** ¿Qué puertos y servicios quedan accesibles desde tu host?
   ¿Alguno no debería estar publicado? ¿Qué versión reporta cada servicio?
2. **Cabeceras y cookies.** Revisa las respuestas HTTP: ¿se divulga información del
   producto? ¿Las cabeceras de seguridad y los atributos de cookie son los esperados
   para el transporte en uso?
3. **Entradas de la API.** Explora la API autenticada (clientes, auditoría, filtros,
   paginación, ordenamiento). Prueba los parámetros de entrada en busca de inyección.

## 3. Entrega

Por cada hallazgo, una fila:

| ID | Herramienta | Evidencia (observación) | Interpretación | Mitigación propuesta |
|---|---|---|---|---|

Separa **observación** (lo que la herramienta mostró) de **interpretación**. La
mitigación debe ser concreta y verificable (qué cambiar y cómo comprobar que se
corrigió). Guarda tus reportes en `evidencias/` (excluida de Git).

## 4. Cerrar

```powershell
docker compose down
```
