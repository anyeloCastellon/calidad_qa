function Get-LabFileHash([string]$LiteralPath) {
    $stream = [IO.File]::OpenRead([IO.Path]::GetFullPath($LiteralPath))
    $algorithm = [Security.Cryptography.SHA256]::Create()
    try { return [BitConverter]::ToString($algorithm.ComputeHash($stream)).Replace('-', '') }
    finally { $stream.Dispose(); $algorithm.Dispose() }
}
