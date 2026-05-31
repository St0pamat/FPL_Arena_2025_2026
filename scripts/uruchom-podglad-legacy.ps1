# Szybki podglad bez Node — stary monolit HTML + pliki JSON w katalogu glownym
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$legacy = Get-ChildItem "$root\archive" -Filter "Skarb kibica*.html" | Select-Object -First 1
if (-not $legacy) {
    Write-Host "Brak pliku HTML w archive/" -ForegroundColor Red
    exit 1
}

$preview = "$root\podglad-legacy.html"
Copy-Item $legacy.FullName $preview -Force
Write-Host "Podglad legacy: http://localhost:8080/podglad-legacy.html" -ForegroundColor Green
Write-Host "Wymaga: wyniki_meczy.json, player_highlights.json, gladiator_or.json, folder logo/ w katalogu projektu." -ForegroundColor Yellow
Write-Host "Ctrl+C aby zatrzymac serwer." -ForegroundColor Gray
python -m http.server 8080
