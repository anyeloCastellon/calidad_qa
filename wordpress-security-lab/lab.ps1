#!/usr/bin/env pwsh
# Lanzadera unica del laboratorio Campus Abierto (Windows / PowerShell).
# Reemplaza los comandos de preparacion y operacion por verbos simples.
# Uso: .\lab.ps1 <up|estado|reset|logs|down|ayuda>
$ErrorActionPreference = 'Stop'
$labRoot = $PSScriptRoot
$comando = if ($args.Count -ge 1) { $args[0].ToLowerInvariant() } else { 'ayuda' }

function Get-LabPort {
    $port = '8088'
    $envPath = Join-Path $labRoot '.env'
    if (Test-Path -LiteralPath $envPath) {
        $portLine = Get-Content -LiteralPath $envPath | Where-Object { $_ -match '^LAB_PORT=[0-9]+$' } | Select-Object -First 1
        if ($portLine) { $port = $portLine.Substring('LAB_PORT='.Length) }
    }
    if ($env:LAB_PORT) { $port = $env:LAB_PORT }
    return $port
}

function Assert-Docker {
    docker info --format '{{.ServerVersion}}' | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Inicia Docker Desktop antes de continuar.' }
}

function Show-Help {
    Write-Output @'
Laboratorio Campus Abierto - comandos disponibles:

  .\lab.ps1 up       Prepara las claves locales, construye las imagenes, levanta
                     el portal y espera a que los datos esten listos.
                     Reemplaza los cinco pasos de preparacion.
  .\lab.ps1 estado   Comprueba que el portal y los datos esten disponibles (LISTO).
  .\lab.ps1 reset    Restaura los datos y las cuentas ficticias.
                     Ejecutalo despues de guardar las evidencias.
  .\lab.ps1 logs     Muestra el registro de la preparacion de datos.
  .\lab.ps1 down     Detiene el laboratorio (conserva el contenido).
  .\lab.ps1 ayuda    Muestra esta ayuda.
'@
}

Push-Location $labRoot
try {
    switch ($comando) {
        'up' {
            Assert-Docker
            & (Join-Path $labRoot 'ops\setup.ps1')
            Write-Output 'Construyendo las imagenes (la primera vez puede tardar)...'
            docker compose --profile tools build
            if ($LASTEXITCODE -ne 0) { throw 'No se pudieron construir las imagenes.' }
            Write-Output 'Levantando el portal...'
            docker compose up -d --wait
            if ($LASTEXITCODE -ne 0) { throw 'No se pudo levantar el laboratorio.' }
            $url = 'http://localhost:' + (Get-LabPort)
            Write-Output 'Esperando a que los datos esten listos...'
            $ready = $false
            for ($i = 0; $i -lt 30; $i++) {
                try {
                    $status = Invoke-RestMethod -Uri ($url + '/wp-json/campus/v1/status') -TimeoutSec 5
                    if ($status.status -eq 'ready') { $ready = $true; break }
                } catch { }
                Start-Sleep -Seconds 2
            }
            if (-not $ready) { throw 'El portal arranco, pero los datos no quedaron listos. Revisa: .\lab.ps1 logs' }
            Write-Output ''
            Write-Output ('LISTO: portal disponible en ' + $url)
            Write-Output 'Siguiente paso: .\lab.ps1 estado  (comprobacion completa)'
        }
        'estado' {
            & (Join-Path $labRoot 'ops\comprobar.ps1')
        }
        'reset' {
            Assert-Docker
            docker compose run --rm wpcli eval-file /opt/lab/reset.php
        }
        'logs' {
            docker compose logs init
        }
        'down' {
            docker compose down
        }
        { $_ -in 'ayuda', 'help', '--help', '-h', '/?' } {
            Show-Help
        }
        default {
            Write-Output ('Comando no reconocido: ' + $comando)
            Write-Output ''
            Show-Help
            exit 1
        }
    }
} finally { Pop-Location }
