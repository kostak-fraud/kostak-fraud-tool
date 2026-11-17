$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$runDir = Join-Path $root '.run'
New-Item -ItemType Directory -Force -Path $runDir | Out-Null

try {
    $existing = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/health' -TimeoutSec 1
    if ($existing.status -eq 'UP') {
        Write-Host 'Kostak Fraud Tool is already running at http://localhost:3000' -ForegroundColor Green
        exit 0
    }
} catch {}

$outputLog = Join-Path $runDir 'preview.log'
$errorLog = Join-Path $runDir 'preview-error.log'
$serverPath = Join-Path $root 'preview\server.mjs'
$server = Start-Process -FilePath 'node' -ArgumentList ('"{0}"' -f $serverPath) `
    -WorkingDirectory $root -RedirectStandardOutput $outputLog -RedirectStandardError $errorLog `
    -WindowStyle Hidden -PassThru
Set-Content -LiteralPath (Join-Path $runDir 'preview.pid') -Value $server.Id

$deadline = (Get-Date).AddSeconds(20)
$health = $null
do {
    try { $health = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/health' -TimeoutSec 2 } catch { Start-Sleep -Milliseconds 400 }
} while (-not $health -and (Get-Date) -lt $deadline)

if (-not $health) { throw "Local server did not become healthy. See $errorLog" }
Write-Host ''
Write-Host 'Kostak Fraud Tool is running:' -ForegroundColor Green
Write-Host '  http://localhost:3000'
Write-Host 'Run .\stop-local.ps1 to stop it.'

