# Synchronizacja danych i logo do public/ (wrapper — cross-platform: scripts/sync-public.mjs)
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root
node scripts/sync-public.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
