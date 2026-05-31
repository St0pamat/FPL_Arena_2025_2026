# Synchronizacja danych i logo do public/ (przed dev lub build)
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

New-Item -ItemType Directory -Force -Path "public\logo" | Out-Null

@("player_highlights.json", "player_season_history.json", "wyniki_meczy.json", "gladiator_or.json") | ForEach-Object {
    if (Test-Path $_) {
        Copy-Item $_ "public\" -Force
        Write-Host "Copied $_"
    }
}

if (Test-Path "logo") {
    Copy-Item -Recurse -Force "logo\*" "public\logo\"
    Write-Host "Copied logo/"
}
