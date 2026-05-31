# predeploy.ps1 --the safety GATE. Run this BEFORE release.ps1 / deploy.
#
#   .\predeploy.ps1
#
# Builds the frontend and runs the backend tests. Exits non-zero (loudly) if
# either fails, so a broken build can never be tagged or deployed. It does NOT
# touch git, tags, or the server --it only checks. Pure safety net.
#
# Why this exists: a broken frontend build (reverted api.js export, an
# undefined component) was tagged and "deployed" while production silently
# stayed on the old version. Running this first makes that impossible.

$ErrorActionPreference = "Stop"
function Fail($m) { Write-Host "`nPREDEPLOY FAILED: $m" -ForegroundColor Red; exit 1 }
function Ok($m)   { Write-Host "   $m" -ForegroundColor Green }

Write-Host "=> [1/2] Building frontend..." -ForegroundColor Cyan
Push-Location frontend
npm run build
$build = $LASTEXITCODE
Pop-Location
if ($build -ne 0) { Fail "frontend build failed --DO NOT deploy" }
Ok "frontend build OK"

Write-Host "=> [2/2] Running backend tests..." -ForegroundColor Cyan
Push-Location backend
python -m pytest tests/ -q -p no:cacheprovider
$tests = $LASTEXITCODE
Pop-Location
if ($tests -ne 0) { Fail "backend tests failed --DO NOT deploy" }
Ok "backend tests OK"

Write-Host "`nPREDEPLOY PASSED --safe to release/deploy." -ForegroundColor Green
