#!/usr/bin/env pwsh
# Lanzadera del Selenium Lab.
# Funciona en Windows PowerShell 5.1 y en PowerShell 7 (Windows, Linux, macOS).
#
# Uso: .\lab.ps1 <comando> [version]
#   version 1 (por defecto) = Mini-Blog QA      version 2 = TaskFlow QA
#   Ej: .\lab.ps1 up      .\lab.ps1 up 2      .\lab.ps1 test 2      .\lab.ps1 reset 2
$ErrorActionPreference = 'Stop'
$labRoot = $PSScriptRoot
$comando = if ($args.Count -ge 1) { ([string]$args[0]).TrimStart('-', '/').ToLowerInvariant() } else { 'ayuda' }
$versionArg = if ($args.Count -ge 2) { ([string]$args[1]).TrimStart('-', '/').ToLowerInvariant().TrimStart('v') } else { '' }

$perfiles = @('--profile', 'v1', '--profile', 'v2', '--profile', 'tests')
$versiones = @{
    '1' = @{ Servicio = 'app';  Tests = 'tests';  Nombre = 'Mini-Blog QA' }
    '2' = @{ Servicio = 'app2'; Tests = 'tests2'; Nombre = 'TaskFlow QA' }
}

$appUrl  = 'http://localhost:5000'
$gridUrl = 'http://localhost:4444'
$vncUrl  = 'http://localhost:7900/?autoconnect=1&resize=scale'

$script:CodigoCompose = 0
function Invoke-Compose([string[]]$argumentos) {
    # Llama a docker compose con todos los perfiles. El codigo de salida queda en
    # $script:CodigoCompose. Notas:
    #  - Los argumentos van en un arreglo: PowerShell trata "--" de forma especial.
    #  - La salida NO se pasa por una tuberia y se usa --progress plain: si no,
    #    "docker compose build" falla en la terminal con "failed to get console".
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { & docker compose @perfiles --progress plain @argumentos } finally { $ErrorActionPreference = $prev }
    $script:CodigoCompose = $LASTEXITCODE
}

function Assert-Docker {
    docker info --format '{{.ServerVersion}}' | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Inicia Docker Desktop (o el servicio Docker) antes de continuar.' }
}

function Get-VersionActiva {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { $corriendo = @(docker compose @perfiles ps --status running --services) } finally { $ErrorActionPreference = $prev }
    if ($corriendo -contains 'app2') { return '2' }
    if ($corriendo -contains 'app') { return '1' }
    return $null
}

function Resolve-Version([bool]$usarActiva) {
    if ($versionArg) {
        if (-not $versiones.ContainsKey($versionArg)) { throw ('Version no valida: ' + $versionArg + ' (usa 1 o 2)') }
        return $versionArg
    }
    if ($usarActiva) { $activa = Get-VersionActiva; if ($activa) { return $activa } }
    return '1'
}

function Start-Version([string]$v, [bool]$recrear) {
    $svc = $versiones[$v].Servicio
    $otra = if ($v -eq '1') { 'app2' } else { 'app' }
    # Ambas versiones usan el puerto 5000: se detiene la otra antes de levantar esta.
    Invoke-Compose @('rm', '--stop', '--force', $otra) | Out-Null
    if ($recrear) {
        # Solo se recrea la app (datos iniciales); el Grid se deja como esta.
        Invoke-Compose @('up', '-d', '--wait', '--force-recreate', $svc)
        if ($script:CodigoCompose -ne 0) { throw ('No se pudo reiniciar la version ' + $v) }
    }
    Invoke-Compose @('up', '-d', '--wait', $svc, 'selenium')
    if ($script:CodigoCompose -ne 0) { throw ('No se pudo levantar la version ' + $v + '. Revisa: .\lab.ps1 logs ' + $v) }
}

function Test-Url([string]$url) {
    try { Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5 | Out-Null; return $true } catch { return $false }
}

function Show-Help {
    Write-Output @'
Selenium Lab - comandos disponibles (agrega 2 para la version 2):

  .\lab.ps1 up [2]     Construye y levanta la app y el Selenium Grid.
                       up = Mini-Blog QA (v1)   up 2 = TaskFlow QA (v2). Ambas en :5000
  .\lab.ps1 test [2]   Corre la suite pytest de esa version contra el Grid.
                       Mira el navegador en http://localhost:7900
                       Reporte JUnit en resultados\junit-v1.xml / junit-v2.xml
  .\lab.ps1 estado     Muestra que version esta arriba y si responde.
  .\lab.ps1 logs [2]   Muestra el registro de la app.
  .\lab.ps1 reset [2]  Reinicia la app con los datos iniciales.
  .\lab.ps1 down       Detiene y elimina todos los contenedores.
  .\lab.ps1 ayuda      Muestra esta ayuda.

Sin numero, test/logs/reset usan la version que este corriendo.
'@
}

Push-Location $labRoot
try {
    switch ($comando) {
        'up' {
            Assert-Docker
            $v = Resolve-Version $false
            Write-Output 'Construyendo la imagen (la primera vez puede tardar)...'
            Invoke-Compose @('build')
            if ($script:CodigoCompose -ne 0) { throw 'No se pudo construir la imagen.' }
            Write-Output ('Levantando ' + $versiones[$v].Nombre + ' (version ' + $v + ') y Selenium Grid...')
            Start-Version $v $false
            Write-Output ''
            Write-Output ('LISTO: ' + $versiones[$v].Nombre.PadRight(14) + ' ' + $appUrl + '   (admin / Admin123)')
            Write-Output ('       Selenium Grid  ' + $gridUrl)
            Write-Output ('       Ver navegador  ' + $vncUrl)
            $sufijo = if ($v -eq '1') { '' } else { ' ' + $v }
            Write-Output ('Siguiente paso: .\lab.ps1 test' + $sufijo)
        }
        { $_ -in 'test', 'tests' } {
            Assert-Docker
            $v = Resolve-Version $true
            if ((Get-VersionActiva) -ne $v) {
                Write-Output ('Levantando ' + $versiones[$v].Nombre + ' (version ' + $v + ')...')
                Start-Version $v $false
            }
            New-Item -ItemType Directory -Force -Path (Join-Path $labRoot 'resultados') | Out-Null
            Write-Output ('Corriendo la suite de la version ' + $v + '. Mira el navegador en ' + $vncUrl)
            Invoke-Compose @('run', '--rm', $versiones[$v].Tests)
            $codigo = $script:CodigoCompose
            Write-Output ''
            if ($codigo -eq 0) { Write-Output 'RESULTADO: la suite termino sin fallas.' }
            else { Write-Output 'RESULTADO: hay pruebas fallidas (revisa el detalle arriba).' }
            exit $codigo
        }
        'estado' {
            $activa = Get-VersionActiva
            if ($activa) { Write-Output ('Version activa: ' + $activa + ' - ' + $versiones[$activa].Nombre) }
            else { Write-Output 'Version activa: ninguna' }
            $okApp  = Test-Url $appUrl
            $okGrid = Test-Url ($gridUrl + '/status')
            Write-Output ('App           ' + $appUrl + '  -> ' + $(if ($okApp) { 'OK' } else { 'NO RESPONDE' }))
            Write-Output ('Selenium Grid ' + $gridUrl + '  -> ' + $(if ($okGrid) { 'OK' } else { 'NO RESPONDE' }))
            if ($okApp -and $okGrid) { Write-Output 'LISTO' } else { Write-Output 'Ejecuta: .\lab.ps1 up   (o .\lab.ps1 up 2)'; exit 1 }
        }
        'logs' {
            $v = Resolve-Version $true
            Invoke-Compose @('logs', $versiones[$v].Servicio)
        }
        'reset' {
            Assert-Docker
            $v = Resolve-Version $true
            Start-Version $v $true
            Write-Output ('LISTO: ' + $versiones[$v].Nombre + ' reiniciada con los datos iniciales.')
        }
        'down' {
            Invoke-Compose @('down')
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
