param([switch]$SkipScreens, [int]$Port = 5199)

$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$root = Split-Path $here -Parent

if (-not $SkipScreens) {
    $vite = Start-Process -FilePath "node" -ArgumentList @("node_modules/vite/bin/vite.js", "src/renderer", "--host", "127.0.0.1", "--port", $Port, "--strictPort") `
        -WorkingDirectory $root -WindowStyle Hidden -PassThru
    try {
        $url = "http://127.0.0.1:$Port"
        $ready = $false
        for ($i = 0; $i -lt 60 -and -not $ready; $i++) {
            Start-Sleep -Milliseconds 500
            try {
                Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 | Out-Null
                $ready = $true
            } catch {
            }
        }
        if (-not $ready) {
            throw "O servidor da interface nao respondeu em $url."
        }
        node (Join-Path $here "capture.mjs") $url (Join-Path $here "img")
        if ($LASTEXITCODE -ne 0) {
            exit $LASTEXITCODE
        }
    } finally {
        Get-CimInstance Win32_Process -Filter "ParentProcessId=$($vite.Id)" | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
        Stop-Process -Id $vite.Id -Force -ErrorAction SilentlyContinue
    }
}

python (Join-Path $here "build_manual.py")
exit $LASTEXITCODE
