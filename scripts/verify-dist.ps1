# Wrapper PowerShell — logika w scripts/verify-dist.mjs
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root
node scripts/verify-dist.mjs
exit $LASTEXITCODE
