param([Parameter(Mandatory=$true)][string]$Source, [switch]$ConfirmRestore)
$ErrorActionPreference = 'Stop'
if (-not $ConfirmRestore) { throw 'La restauración reemplaza la base y documentos del laboratorio. Ejecute con -ConfirmRestore para autorizarla.' }
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
    $sourcePath = [IO.Path]::GetFullPath($Source)
    $manifestPath = Join-Path $sourcePath 'manifest.json'
    if (-not (Test-Path -LiteralPath $manifestPath)) { throw 'Falta manifest.json del respaldo.' }
    $manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
    if ($manifest.format -ne 'atlas-backup-v1') { throw 'Formato de respaldo desconocido.' }
    $dumpPath = Join-Path $sourcePath 'atlas.dump'
    if ((Get-FileHash -LiteralPath $dumpPath -Algorithm SHA256).Hash -ne $manifest.databaseSha256) { throw 'El respaldo PostgreSQL no coincide con su hash.' }
    $keyLine = Get-Content -LiteralPath '.env' | Where-Object { $_.StartsWith('ENCRYPTION_KEY=') }
    $sha = [Security.Cryptography.SHA256]::Create()
    try { $keyHash = [BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($keyLine))).Replace('-','').ToLowerInvariant() } finally { $sha.Dispose() }
    if ($keyHash -ne $manifest.encryptionKeyFingerprint) { throw 'La clave de cifrado local no corresponde al respaldo. No se han cambiado datos.' }
    if (-not (Test-Path -LiteralPath (Join-Path $sourcePath 'storage') -PathType Container)) { throw 'Falta el almacenamiento del respaldo.' }
    $storagePath = [IO.Path]::GetFullPath((Join-Path $sourcePath 'storage'))
    $storedFiles = @(Get-ChildItem -LiteralPath $storagePath -Recurse -File)
    if ($storedFiles.Count -ne $manifest.documents -or @($manifest.files).Count -ne $manifest.documents) { throw 'El inventario de documentos no coincide; no se han cambiado datos.' }
    foreach ($entry in $manifest.files) {
        $filePath = [IO.Path]::GetFullPath((Join-Path $storagePath $entry.path))
        if (-not $filePath.StartsWith($storagePath + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Ruta fuera del respaldo de documentos.' }
        $fileInfo = Get-Item -LiteralPath $filePath
        if ($fileInfo.Length -ne $entry.bytes -or (Get-FileHash -LiteralPath $filePath -Algorithm SHA256).Hash -ne $entry.sha256) { throw 'Documento del respaldo alterado o incompleto; no se han cambiado datos.' }
    }
    docker compose stop web backend
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo detener la aplicación.' }
    docker compose cp $dumpPath db:/tmp/atlas-restore.dump
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo preparar el respaldo.' }
    docker compose exec -T db pg_restore -U atlas -d atlas --clean --if-exists --exit-on-error /tmp/atlas-restore.dump
    if ($LASTEXITCODE -ne 0) { throw 'Falló la restauración PostgreSQL; la aplicación permanece detenida.' }
    docker compose run --rm --no-deps backend node --input-type=module -e "import{readdir,rm}from'node:fs/promises';import path from'node:path';const root='/srv/storage';for(const name of await readdir(root)){const target=path.resolve(root,name);if(!target.startsWith(root+'/'))throw Error('Ruta inválida');await rm(target,{recursive:true,force:true})}"
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo preparar el volumen de documentos.' }
    docker compose cp (Join-Path $sourcePath 'storage/.') backend:/srv/storage
    if ($LASTEXITCODE -ne 0) { throw 'No se pudieron restaurar los documentos.' }
    docker compose run --rm --no-deps --user root backend node --input-type=module -e "import{readdir,chown,chmod}from'node:fs/promises';import path from'node:path';async function own(dir){await chown(dir,1000,1000);await chmod(dir,448);for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())await own(p);else{await chown(p,1000,1000);await chmod(p,384)}}}await own('/srv/storage')"
    if ($LASTEXITCODE -ne 0) { throw 'No se pudieron ajustar los permisos de documentos restaurados.' }
    docker compose run --rm --no-deps backend npm run lab:invalidate
    if ($LASTEXITCODE -ne 0) { throw 'No se pudieron invalidar sesiones restauradas.' }
    docker compose up -d --wait backend web
    if ($LASTEXITCODE -ne 0) { throw 'Revise el arranque de la aplicación restaurada.' }
    Write-Output 'Base y documentos restaurados. Inicie sesión nuevamente.'
} finally { Pop-Location }
