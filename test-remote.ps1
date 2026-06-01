# test-remote.ps1 — SSH into the home server and run Playwright E2E tests.
#
# Usage:
#   .\test-remote.ps1 <user> <host>
#
# What it does on the remote (one SSH round-trip):
#   1. cd ~/code/store/frontend
#   2. npm ci --prefer-offline        (sync deps from lock file)
#   3. npx playwright install chromium --with-deps   (idempotent)
#   4. npx playwright test            (builds + previews + runs specs)

param(
    [Parameter(Mandatory = $true, Position = 0,
        HelpMessage = "Remote SSH username, e.g. 'shahar'")]
    [string]$Username,

    [Parameter(Mandatory = $true, Position = 1,
        HelpMessage = "Remote host or IP, e.g. '89.139.33.201'")]
    [string]$Hostname
)

$ErrorActionPreference = 'Stop'
$SshTarget = "$Username@$Hostname"

Write-Host "=> Connecting to $SshTarget ..."
Write-Host ""

$RemoteScript = @'
set -e
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

CHROME=$(which google-chrome-stable 2>/dev/null || true)
if [ -z "$CHROME" ]; then
  echo "ERROR: google-chrome-stable not found. Run this once on the server:"
  echo "  wget -qO- https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor | sudo tee /etc/apt/trusted.gpg.d/google-chrome.gpg > /dev/null"
  echo "  echo 'deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main' | sudo tee /etc/apt/sources.list.d/google-chrome.list > /dev/null"
  echo "  sudo apt-get update -qq && sudo apt-get install -y google-chrome-stable"
  exit 1
fi

cd code/store/frontend
npm ci --prefer-offline
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="$CHROME"
npx playwright test
'@

$RemoteScript = $RemoteScript -replace "`r`n", "`n"
$Bytes = [System.Text.Encoding]::UTF8.GetBytes($RemoteScript)
$B64 = [Convert]::ToBase64String($Bytes)
$RemoteCommand = "echo $B64 | base64 -d | bash"

ssh -t $SshTarget $RemoteCommand

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "=> E2E tests FAILED (exit $LASTEXITCODE)." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "=> All E2E tests passed." -ForegroundColor Green
