# Cuidarte+

Requiere Docker con Compose.

Desde esta carpeta, en PowerShell:

```powershell
.\ops\setup.ps1
docker compose up -d --build --wait
```

En Linux/macOS:

```sh
sh ops/setup.sh
docker compose up -d --build --wait
```

- Aplicación: http://localhost:5181
- Correo local: http://localhost:8027
- API técnica: http://localhost:5181/api/docs/

| Usuario | Contraseña |
|---|---|
| `admin.demo` | `CuidarteDemo!2026` |
| `medico.demo` | `CuidarteDemo!2026` |
| `medico.turno` | `CuidarteDemo!2026` |
| `paciente.demo` | `CuidarteDemo!2026` |
| `paciente.otro` | `CuidarteDemo!2026` |

Para detener:

```sh
docker compose down
```
