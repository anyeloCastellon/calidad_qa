$ErrorActionPreference = 'Stop'
$envPath = Join-Path (Split-Path $PSScriptRoot -Parent) '.env'
if (Test-Path -LiteralPath $envPath) { Write-Output '.env existente conservado.'; exit 0 }
function New-CampusSecret {
    $bytes = New-Object byte[] 32
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    return [BitConverter]::ToString($bytes).Replace('-', '').ToLowerInvariant()
}
$lines = @('DB_PASSWORD=' + (New-CampusSecret); 'DB_ROOT_PASSWORD=' + (New-CampusSecret); 'ADMIN_PASSWORD=' + (New-CampusSecret); 'LAB_PORT=8088')
[IO.File]::WriteAllLines($envPath, $lines, [Text.UTF8Encoding]::new($false))
Write-Output 'Claves locales creadas. No publique .env.'
