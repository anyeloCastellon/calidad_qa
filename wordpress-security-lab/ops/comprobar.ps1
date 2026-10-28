$ErrorActionPreference = 'Stop'
$labRoot = Split-Path $PSScriptRoot -Parent
Push-Location $labRoot
try {
    docker info --format '{{.ServerVersion}}' | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Inicie Docker Desktop antes de continuar.' }
    $port = '8088'
    if (Test-Path -LiteralPath '.env') {
        $portLine = Get-Content -LiteralPath '.env' | Where-Object { $_ -match '^LAB_PORT=[0-9]+$' } | Select-Object -First 1
        if ($portLine) { $port = $portLine.Substring('LAB_PORT='.Length) }
    }
    if ($env:LAB_PORT) { $port = $env:LAB_PORT }
    $url = 'http://localhost:' + $port
    $status = Invoke-RestMethod -Uri ($url + '/wp-json/campus/v1/status') -TimeoutSec 10
    if ($status.status -ne 'ready') { throw 'El portal no ha terminado de preparar sus datos.' }
    $version = docker compose run --rm --no-deps wpcli core version 2>$null
    if ($LASTEXITCODE -ne 0 -or ($version | Select-Object -Last 1).Trim() -ne '7.1.3') { throw 'Revise el nucleo WordPress y la inicializacion del laboratorio.' }
    docker compose run --rm --no-deps wpcli plugin is-active campus-aula 2>$null
    if ($LASTEXITCODE -ne 0) { throw 'El componente Campus Aula no esta activo.' }
    $scannerVersion = docker compose run --rm --no-deps wpscan --version 2>$null
    if ($LASTEXITCODE -ne 0) { throw 'Construya la imagen de WPScan antes de clase.' }
    $sqlmapVersion = docker compose run --rm --no-deps sqlmap --version 2>$null
    if ($LASTEXITCODE -ne 0) { throw 'Construya la imagen de SQLMap antes de clase.' }
    Write-Output ('LISTO: portal y datos disponibles en ' + $url)
    Write-Output ('WordPress ' + ($version | Select-Object -Last 1))
    Write-Output (($scannerVersion | Where-Object { $_ -match 'Current Version' }) -join '')
    Write-Output ('SQLMap ' + ($sqlmapVersion | Select-Object -Last 1))
    Write-Output 'Material y dos cuentas de estudiante disponibles para iniciar la clase.'
} finally { Pop-Location }
