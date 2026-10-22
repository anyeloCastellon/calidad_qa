param([Parameter(Mandatory=$true)][string]$Destination)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'file-hash.ps1')
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
    $backupPath = [IO.Path]::GetFullPath($Destination)
    if (Test-Path -LiteralPath $backupPath) { throw 'El destino ya existe; use una carpeta nueva.' }
    New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
    docker compose stop web backend
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo detener la aplicación para una copia consistente.' }
    try {
        docker compose exec -T db pg_dump -U cuidarte -d cuidarte --format=custom --file=/tmp/cuidarte-backup.dump
        if ($LASTEXITCODE -ne 0) { throw 'Falló pg_dump.' }
        docker compose cp db:/tmp/cuidarte-backup.dump (Join-Path $backupPath 'cuidarte.dump')
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo copiar el respaldo PostgreSQL.' }
        New-Item -ItemType Directory -Path (Join-Path $backupPath 'storage') -Force | Out-Null
        docker compose cp backend:/srv/storage/. (Join-Path $backupPath 'storage')
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo copiar el almacenamiento de documentos.' }
        $keyLine = Get-Content -LiteralPath '.env' | Where-Object { $_.StartsWith('ENCRYPTION_KEY=') }
        $sha = [Security.Cryptography.SHA256]::Create()
        try { $keyHash = [BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($keyLine))).Replace('-','').ToLowerInvariant() } finally { $sha.Dispose() }
        $storagePath = Join-Path $backupPath 'storage'
        $inventory = @(Get-ChildItem -LiteralPath $storagePath -Recurse -File | ForEach-Object {
            [ordered]@{
                path = $_.FullName.Substring($storagePath.Length).TrimStart([IO.Path]::DirectorySeparatorChar)
                bytes = $_.Length
                sha256 = Get-LabFileHash $_.FullName
            }
        })
        $manifest = [ordered]@{
            format = 'cuidarte-backup-v1'
            createdUtc = [DateTime]::UtcNow.ToString('o')
            encryptionKeyFingerprint = $keyHash
            databaseSha256 = Get-LabFileHash (Join-Path $backupPath 'cuidarte.dump')
            documents = $inventory.Count
            files = $inventory
        }
        $manifest | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $backupPath 'manifest.json') -Encoding utf8
        Write-Output ('Respaldo terminado en ' + $backupPath + '. Conserve .env por separado y de forma segura.')
    } finally {
        docker compose up -d --wait backend web
        if ($LASTEXITCODE -ne 0) { Write-Warning 'Revise el estado de la aplicación después del respaldo.' }
    }
} finally { Pop-Location }
