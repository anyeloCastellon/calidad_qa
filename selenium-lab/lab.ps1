#!/usr/bin/env pwsh
# Lanzadera del Selenium Lab (Mini-Blog QA + Selenium Grid).
# Funciona en Windows PowerShell 5.1 y en PowerShell 7 (Windows, Linux, macOS).
# Uso: .\lab.ps1 <up|test|estado|logs|reset|down|ayuda>   (tambien acepta -up, --up, etc.)
$ErrorActionPreference = 'Stop'
$labRoot = $PSScriptRoot
$comando = if ($args.Count -ge 1) { ([string]$args[0]).TrimStart('-', '/').ToLowerInvariant() } else { 'ayuda' }

$appUrl  = 'http://localhost:5000'
$gridUrl = 'http://localhost:4444'
$vncUrl  = 'http://localhost:7900/?autoconnect=1&resize=scale'

function Assert-Docker {
    docker info --format '{{.ServerVersion}}' | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Inicia Docker Desktop (o el servicio Docker) antes de continuar.' }
}

function Test-Url([string]$url) {
    try { Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5 | Out-Null; return $true } catch { return $false }
}

function Show-Help {
    Write-Output @'
Selenium Lab - comandos disponibles:

  .\lab.ps1 up       Construye la imagen y levanta el Mini-Blog y el Selenium Grid.
                     Espera a que ambos esten listos.
  .\lab.ps1 test     Corre la suite pytest (AUT-01, AUT-02, AUT-03) contra el Grid.
                     Mientras corre, mira el navegador en http://localhost:7900
                     Resultado JUnit en resultados\junit.xml
  .\lab.ps1 estado   Comprueba que la app y el Grid respondan.
  .\lab.ps1 logs     Muestra el registro de la app.
  .\lab.ps1 reset    Reinicia la app con la base de datos limpia.
  .\lab.ps1 down     Detiene y elimina los contenedores.
  .\lab.ps1 ayuda    Muestra esta ayuda.
'@
}

Push-Location $labRoot
try {
    switch ($comando) {
        'up' {
            Assert-Docker
            Write-Output 'Construyendo la imagen (la primera vez puede tardar)...'
            docker compose --profile tests build
            if ($LASTEXITCODE -ne 0) { throw 'No se pudo construir la imagen.' }
            Write-Output 'Levantando Mini-Blog y Selenium Grid...'
            docker compose up -d --wait app selenium
            if ($LASTEXITCODE -ne 0) { throw 'No se pudo levantar el laboratorio. Revisa: .\lab.ps1 logs' }
            Write-Output ''
            Write-Output ('LISTO: Mini-Blog      ' + $appUrl + '   (admin / Admin123)')
            Write-Output ('       Selenium Grid  ' + $gridUrl)
            Write-Output ('       Ver navegador  ' + $vncUrl)
            Write-Output 'Siguiente paso: .\lab.ps1 test'
        }
        { $_ -in 'test', 'tests' } {
            Assert-Docker
            New-Item -ItemType Directory -Force -Path (Join-Path $labRoot 'resultados') | Out-Null
            Write-Output ('Corriendo la suite. Mira el navegador en ' + $vncUrl)
            docker compose --profile tests run --rm tests
            $codigo = $LASTEXITCODE
            Write-Output ''
            if ($codigo -eq 0) { Write-Output 'RESULTADO: todas las pruebas pasaron.' }
            else { Write-Output 'RESULTADO: hay pruebas fallidas (revisa el detalle arriba).' }
            exit $codigo
        }
        'estado' {
            $okApp  = Test-Url $appUrl
            $okGrid = Test-Url ($gridUrl + '/status')
            Write-Output ('Mini-Blog     ' + $appUrl + '  -> ' + $(if ($okApp) { 'OK' } else { 'NO RESPONDE' }))
            Write-Output ('Selenium Grid ' + $gridUrl + '  -> ' + $(if ($okGrid) { 'OK' } else { 'NO RESPONDE' }))
            if ($okApp -and $okGrid) { Write-Output 'LISTO' } else { Write-Output 'Ejecuta: .\lab.ps1 up'; exit 1 }
        }
        'logs' {
            docker compose logs app
        }
        'reset' {
            Assert-Docker
            docker compose up -d --wait --force-recreate app
            if ($LASTEXITCODE -ne 0) { throw 'No se pudo reiniciar la app.' }
            Write-Output 'LISTO: app reiniciada con datos limpios.'
        }
        'down' {
            docker compose --profile tests down
        }
        { $_ -in 'ayuda', 'help', 'h', '?' } {
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
