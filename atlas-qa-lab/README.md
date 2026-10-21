# Atlas — objeto de evaluación QA para EP3

Aplicación local de gestión de empresas, usuarios, clientes, contratos y documentos, construida con **React, Express y PostgreSQL**. Incluye el código fuente y la infraestructura Docker del producto que se examina en EP3; el plan, los casos, el análisis y el informe los realiza el estudiante.

Atlas es independiente de los laboratorios MiniBank. Utiliza exclusivamente datos ficticios.

## Preparación y arranque

Requiere Docker con Compose y PowerShell para los comandos siguientes. Desde `atlas-qa-lab`:

```powershell
./ops/setup.ps1
docker compose up --build -d --wait
```

`setup.ps1` prepara la configuración y genera los secretos locales en `.env`. No publique este archivo. El arranque prepara los servicios y el dataset; los datos se conservan en los volúmenes del laboratorio.

En un entorno POSIX está disponible `sh ./ops/setup.sh`; el comando de Compose es el mismo.

| Recurso | Dirección |
|---|---|
| Atlas | http://localhost:5180 |
| Buzón local Mailpit | http://localhost:8026 |
| Estado técnico | http://localhost:5180/api/lab/status |

El navegador accede a Atlas y Mailpit mediante HTTP en el equipo local, con los puertos publicados exclusivamente en loopback. Utilice datos ficticios y mantenga la instalación local.

## Conexiones internas

Las conexiones internas con el backend y PostgreSQL conservan TLS; SMTP utiliza STARTTLS. Los certificados internos son administrados por la infraestructura. Para usar la interfaz no necesita exportar certificados ni importar una CA en Windows o en el navegador. Este modo local no implica cifrado TLS de extremo a extremo.

## Acceso y datos iniciales

| Usuario | Membresías iniciales |
|---|---|
| `admin.atlas` | Administrador de Atlas Norte SpA; editor de Servicios Sur SpA |
| `editor.atlas` | Editor de Atlas Norte SpA |
| `admin.sur` | Administrador de Servicios Sur SpA |

Contraseña ficticia común: `AtlasDemo!2026`. El dataset contiene dos empresas, 40 clientes y ocho contratos.

El registro utiliza correos ficticios; lea la confirmación en Mailpit local. La instalación no requiere enviar mensajes a destinatarios reales. Seleccione la empresa activa para operar; las membresías y los roles pueden ser diferentes entre empresas.

## Operación diaria

```powershell
docker compose ps
docker compose logs backend
docker compose down
```

`down` detiene los servicios. Un nuevo arranque conserva el contenido de los volúmenes. Para volver expresamente al dataset inicial:

```powershell
docker compose exec -T backend npm run lab:reset
```

El reset repone el dataset e invalida las sesiones. Elimina los datos de trabajo de la aplicación; no sustituye un respaldo. No limpia por sí mismo el historial del navegador, las autorizaciones de herramientas ni los logs históricos.

## Respaldo y restauración

Desde esta carpeta:

```powershell
./ops/backup.ps1 -Destination ./backups/mi-respaldo
```

El respaldo reúne PostgreSQL y los documentos almacenados. `.env` queda excluido por defecto: conserve una copia segura separada de la configuración y sus claves. Para descifrar los datos en otro equipo se necesitan las claves originales; un respaldo de tablas y archivos no las reemplaza.

Para restaurar ese respaldo en el entorno preparado:

```powershell
./ops/restore.ps1 -Source ./backups/mi-respaldo -ConfirmRestore
```

La restauración detiene la aplicación y restaura PostgreSQL y storage, conservando `.env` y sus claves. Compruebe después el estado de los servicios y vuelva a iniciar sesión.

## Documentación

- [Manual de usuario](student/MANUAL_USUARIO.md): acceso y operaciones del producto.
- [Contrato operativo](student/CONTRATO_OPERATIVO.md): fechas, roles, filtros, documentos y enlaces.
- La ERS y el encargo de EP3 son entregados por el docente.

`/api/lab/status` identifica el estado técnico de la instalación. No contiene un conteo de fallos ni una calificación de seguridad o cumplimiento. La configuración `sonar-project.properties` delimita las fuentes del análisis estático; los hallazgos y conclusiones deben obtenerse y justificarse durante la evaluación.

Mantenga fuera de Git secretos, certificados privados, respaldos, archivos subidos, logs, evidencia y material docente. Este repositorio entrega el software examinable, no una solución de la evaluación.
