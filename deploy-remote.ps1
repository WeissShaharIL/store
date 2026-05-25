# deploy-remote.ps1 — SSH into the home server, pull latest tag from main, and deploy.
#
# Usage:
#   .\deploy-remote.ps1 <user> <host>
#
# What it does on the remote (one SSH round-trip):
#   1. cd ~/code/store
#   2. git fetch --tags --prune --force origin
#   3. git checkout main && git reset --hard origin/main
#   4. chmod +x deploy.sh
#   5. ./deploy.sh   (no args — picks the latest version tag automatically)

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
cd code/store
git fetch --tags --prune --force origin
git checkout main
git reset --hard origin/main
sed -i 's/\r$//' deploy.sh
chmod +x deploy.sh
./deploy.sh
'@

$RemoteScript = $RemoteScript -replace "`r`n", "`n"
$Bytes = [System.Text.Encoding]::UTF8.GetBytes($RemoteScript)
$B64 = [Convert]::ToBase64String($Bytes)
$RemoteCommand = "echo $B64 | base64 -d | bash"

ssh -t $SshTarget $RemoteCommand

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "=> Remote deploy FAILED (exit $LASTEXITCODE)." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "=> Done." -ForegroundColor Green
