$ErrorActionPreference = 'Stop'
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
    New-Item -ItemType Directory -Path 'certs-local' -Force | Out-Null
    docker compose cp web:/certs/ca.crt ./certs-local/ca.crt
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo exportar la CA pública. Inicie el laboratorio primero.' }
    Write-Output 'CA pública en certs-local/ca.crt. No se ha modificado el almacén de confianza del equipo.'
} finally { Pop-Location }
