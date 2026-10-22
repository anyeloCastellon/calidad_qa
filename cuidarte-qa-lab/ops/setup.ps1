$ErrorActionPreference = 'Stop'
$labRoot = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $labRoot '.env'
if (Test-Path -LiteralPath $envFile) {
    Write-Output '.env ya existe; se conserva sin regenerar claves.'
    exit 0
}
function New-LabSecret([switch]$Base64) {
    $buffer = New-Object byte[] 32
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($buffer) } finally { $generator.Dispose() }
    if ($Base64) { return [Convert]::ToBase64String($buffer) }
    return [BitConverter]::ToString($buffer).Replace('-', '').ToLowerInvariant()
}
$content = @(
    'PGPASSWORD=' + (New-LabSecret)
    'JWT_SECRET=' + (New-LabSecret)
    'ENCRYPTION_KEY=' + (New-LabSecret -Base64)
    'APP_PORT=5181'
    'MAIL_PORT=8027'
    'PASSWORD_MIN_LENGTH=12'
    ('SEED_REFERENCE_DATE=' + [DateTime]::UtcNow.ToString('yyyy-MM-dd'))
)
[IO.File]::WriteAllLines($envFile, $content, [Text.UTF8Encoding]::new($false))
Write-Output '.env creado con claves locales aleatorias. Consérvelo fuera de Git.'
