$runDir = Join-Path $PSScriptRoot '.run'
foreach ($name in @('preview', 'backend', 'frontend')) {
    $pidFile = Join-Path $runDir "$name.pid"
    if (Test-Path -LiteralPath $pidFile) {
        $processId = [int](Get-Content -LiteralPath $pidFile)
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $pidFile -Force
    }
}
Write-Host 'Local services stopped.'

