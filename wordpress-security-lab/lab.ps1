#!/usr/bin/env pwsh
# Lanzadera unica del laboratorio Campus Abierto (Windows / PowerShell).
# Reemplaza los comandos de preparacion y operacion por verbos simples.
# Uso: .\lab.ps1 <up|estado|reset|logs|stress|down|ayuda>
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
  .\lab.ps1 stress A Prueba de carga constante: 10 usuarios, 2 min    (3.4)
  .\lab.ps1 stress B Prueba de estres: 0 a 500 usuarios en 5 min      (3.4)
  .\lab.ps1 stress C Prueba de pico: de 10 a 200 usuarios en 10 s     (3.4)
                     Deja el reporte HTML en stress\resultados\
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
        'stress' {
            Assert-Docker
            $escenario = if ($args.Count -ge 2) { ([string]$args[1]).ToUpperInvariant() } else { '' }
            $escenarios = @{
                'A' = @{ Nombre = 'Carga constante (10 usuarios, 2 min)';      Props = @('-Ja_usuarios=10') }
                'B' = @{ Nombre = 'Estres (0 a 500 usuarios en 5 min)';        Props = @('-Jb_usuarios=500') }
                'C' = @{ Nombre = 'Pico (10 usuarios + rafaga a 200 en 10 s)'; Props = @('-Jc_base=10', '-Jc_rafaga=190') }
            }
            if (-not $escenarios.ContainsKey($escenario)) {
                Write-Output 'Uso: .\lab.ps1 stress A  (carga)  |  B  (estres)  |  C  (pico)'
                exit 1
            }
            $port = Get-LabPort
            $url = 'http://localhost:' + $port
            try { Invoke-WebRequest -Uri ($url + '/') -UseBasicParsing -TimeoutSec 10 | Out-Null }
            catch { throw 'El portal no responde. Primero: .\lab.ps1 up' }

            $monitor = $null
            $cid = $null
            $codigo = 1
            $prev = $ErrorActionPreference
            $ErrorActionPreference = 'Continue'
            try {
                Write-Output 'Preparando JMeter (la primera vez descarga Java y JMeter)...'
                docker compose --profile stress --progress plain build jmeter
                if ($LASTEXITCODE -ne 0) { throw 'No se pudo construir la imagen de JMeter.' }
                $cid = (docker compose ps -q wordpress | Select-Object -First 1)
                if (-not $cid) { throw 'No encuentro el contenedor de WordPress. Ejecuta: .\lab.ps1 up' }

                # Servidor "chico": 1 CPU (se puede cambiar con $env:LAB_STRESS_CPUS).
                $cpus = if ($env:LAB_STRESS_CPUS) { $env:LAB_STRESS_CPUS } else { '1' }
                docker update --cpus $cpus $cid | Out-Null

                $sello = Get-Date -Format 'yyyyMMdd-HHmmss'
                $rel = 'resultados/' + $escenario + '-' + $sello
                $dir = Join-Path (Join-Path $labRoot 'stress\resultados') ($escenario + '-' + $sello)
                New-Item -ItemType Directory -Force -Path $dir | Out-Null
                $stats = Join-Path $dir 'docker-stats.csv'

                # Monitoreo de CPU y memoria del servidor mientras corre la prueba.
                $monitor = Start-Job -ArgumentList $cid, $stats -ScriptBlock {
                    param($cid, $archivo)
                    'segundo,cpu,memoria' | Set-Content -Path $archivo -Encoding ascii
                    $t0 = Get-Date
                    while ($true) {
                        $linea = docker stats --no-stream --format '{{.CPUPerc}},{{.MemUsage}}' $cid
                        $seg = [int]((Get-Date) - $t0).TotalSeconds
                        ($seg.ToString() + ',' + $linea) | Add-Content -Path $archivo -Encoding ascii
                    }
                }

                Write-Output ''
                Write-Output ('Escenario ' + $escenario + ': ' + $escenarios[$escenario].Nombre)
                Write-Output ('Servidor WordPress limitado a ' + $cpus + ' CPU. Tip: en otra terminal ejecuta  docker stats')
                Write-Output ''
                $jmArgs = @('-n', '-t', 'plan-estres.jmx', '-l', ($rel + '/resultados.jtl'),
                            '-e', '-o', ($rel + '/reporte'), '-j', ($rel + '/jmeter.log'),
                            '-Jhost=gateway', '-Jpuerto=80', ('-Jhost_header=localhost:' + $port),
                            '-Jjmeter.reportgenerator.overall_granularity=5000') + $escenarios[$escenario].Props
                docker compose --profile stress run --rm jmeter @jmArgs
                $codigo = $LASTEXITCODE
            } finally {
                if ($monitor) { Stop-Job $monitor; Remove-Job $monitor -Force }
                # Quitar el limite: se devuelven todas las CPU del equipo ("--cpus 0" no lo quita).
                if ($cid) { docker update --cpus (docker info --format '{{.NCPU}}') $cid | Out-Null }
                $ErrorActionPreference = $prev
            }
            if ($codigo -ne 0) { throw ('JMeter termino con errores. Revisa ' + (Join-Path $dir 'jmeter.log')) }

            # Resumen rapido (el detalle esta en el reporte HTML).
            $filas = Import-Csv (Join-Path $dir 'resultados.jtl')
            $total = $filas.Count
            $errores = @($filas | Where-Object { $_.success -ne 'true' }).Count
            $tiempos = @($filas | ForEach-Object { [int]$_.elapsed } | Sort-Object)
            $p90 = $tiempos[[math]::Min($total - 1, [int][math]::Floor($total * 0.9))]
            $prom = [math]::Round(($tiempos | Measure-Object -Average).Average)
            $marcas = $filas | ForEach-Object { [long]$_.timeStamp } | Measure-Object -Minimum -Maximum
            $segundos = [math]::Max(1, ($marcas.Maximum - $marcas.Minimum) / 1000)
            $cpuMax = (Import-Csv $stats | ForEach-Object { [double]($_.cpu -replace '[^0-9.]', '') } | Measure-Object -Maximum).Maximum
            Write-Output ''
            Write-Output ('RESUMEN escenario ' + $escenario)
            Write-Output ('  Peticiones      : ' + $total)
            Write-Output ('  Error %         : ' + [math]::Round(100 * $errores / [math]::Max(1, $total), 2) + ' %  (' + $errores + ' fallidas)')
            Write-Output ('  Tiempo promedio : ' + $prom + ' ms   (p90: ' + $p90 + ' ms)')
            Write-Output ('  Throughput      : ' + [math]::Round($total / $segundos, 1) + ' peticiones/s')
            Write-Output ('  CPU maxima      : ' + $cpuMax + ' %   (100 % = 1 CPU completa)')
            Write-Output ''
            Write-Output ('Reporte HTML : ' + (Join-Path $dir 'reporte\index.html'))
            Write-Output ('CPU/memoria  : ' + $stats)
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
