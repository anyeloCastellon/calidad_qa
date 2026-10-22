# Atlas

Requisitos: Docker con Compose y PowerShell.

Desde esta carpeta:

```powershell
./ops/setup.ps1
docker compose up --build -d --wait
```

En Linux/macOS, utilice `sh ./ops/setup.sh` en lugar de `setup.ps1`; requiere OpenSSL.

| Servicio | Dirección |
|---|---|
| Atlas | http://localhost:5180 |
| Mailpit | http://localhost:8026 |

Usuarios de prueba: `admin.atlas`, `editor.atlas`, `admin.sur`.

Contraseña común: `AtlasDemo!2026`.

Para detener el entorno:

```powershell
docker compose down
```
