param([Parameter(Mandatory=$true)][string]$Destination)
$ErrorActionPreference = 'Stop'
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
    $backupPath = [IO.Path]::GetFullPath($Destination)
    if (Test-Path -LiteralPath $backupPath) { throw 'El destino ya existe; use una carpeta nueva.' }
    New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
    docker compose stop web backend
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo detener la aplicación para una copia consistente.' }
    try {
        docker compose exec -T db pg_dump -U atlas -d atlas --format=custom --file=/tmp/atlas-backup.dump
        if ($LASTEXITCODE -ne 0) { throw 'Falló pg_dump.' }
        docker compose cp db:/tmp/atlas-backup.dump (Join-Path $backupPath 'atlas.dump')
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
                sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
            }
        })
        $manifest = [ordered]@{
            format = 'atlas-backup-v1'
            createdUtc = [DateTime]::UtcNow.ToString('o')
            encryptionKeyFingerprint = $keyHash
            databaseSha256 = (Get-FileHash -LiteralPath (Join-Path $backupPath 'atlas.dump') -Algorithm SHA256).Hash
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
