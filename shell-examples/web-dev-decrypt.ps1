$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$inputFile = Join-Path $scriptDir 'sample-message.txt.gpg'
$defaultDevPort = 5173
$baseUrl = "http://localhost:$defaultDevPort/"

if (-not (Test-Path -LiteralPath $inputFile)) {
    throw "Input file not found: $inputFile"
}

$bytes = [System.IO.File]::ReadAllBytes($inputFile)
$base64 = [System.Convert]::ToBase64String($bytes)
$base64Url = $base64.TrimEnd('=') -replace '\+', '-' -replace '/', '_'
$encodedMessage = [System.Uri]::EscapeDataString($base64Url)
$url = "${baseUrl}?urlsafe-pgp-message=$encodedMessage"

Write-Host "Opening: $url"
Start-Process $url