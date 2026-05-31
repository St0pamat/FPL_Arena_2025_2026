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

if (Test-Path "soundtracks") {
    $wavCount = (Get-ChildItem "soundtracks\*.wav" -ErrorAction SilentlyContinue | Measure-Object).Count
    if ($wavCount -gt 0) {
        New-Item -ItemType Directory -Force -Path "public\soundtracks" | Out-Null
        Copy-Item -Force "soundtracks\*.wav" "public\soundtracks\"
        $zipName = "FPL-Arena-Soundtrack-Sezon-2025-26.zip"
        $zipPath = Join-Path "public" $zipName
        if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
        # ZIP z kopii w public/ (unika blokady OneDrive na plikach zrodlowych)
        Compress-Archive -Path "public\soundtracks\*.wav" -DestinationPath $zipPath -CompressionLevel Fastest
        Write-Host "Copied soundtracks/ ($wavCount files) + $zipName"
    } else {
        Write-Host "soundtracks/ exists but no .wav files - skip"
    }
}
