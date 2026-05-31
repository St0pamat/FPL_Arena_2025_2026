# Uruchomienie aplikacji Vite (development)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

Write-Host "=== 1/3: Synchronizacja danych do public/ ===" -ForegroundColor Cyan
& "$root\scripts\sync-public.ps1"

if (-not (Test-Path "$root\node_modules\vite")) {
    Write-Host "=== 2/3: npm install (pierwsze uruchomienie) ===" -ForegroundColor Cyan
    Write-Host "Jesli wisie: zamknij i uruchom w zwyklym PowerShell (poza OneDrive sync)." -ForegroundColor Yellow
    # Obejscie typowego bledu certyfikatu na Windows / proxy:
    $env:NODE_TLS_REJECT_UNAUTHORIZED = "0"
    npm install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) {
        Write-Host "npm install nie powiodl sie. Sprobuj:" -ForegroundColor Red
        Write-Host "  npm config set strict-ssl false" -ForegroundColor Yellow
        Write-Host "  npm install" -ForegroundColor Yellow
        Write-Host "Lub podglad legacy: .\scripts\uruchom-podglad-legacy.ps1" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "=== 2/3: node_modules OK ===" -ForegroundColor Green
}

Write-Host "=== 3/3: npm run dev ===" -ForegroundColor Cyan
Write-Host "Otworz: http://localhost:5173" -ForegroundColor Green
npm run dev
