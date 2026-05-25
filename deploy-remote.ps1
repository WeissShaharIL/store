# deploy-remote.ps1 — SSH into the home server, pull, and deploy.
#
# Usage:
#   .\deploy-remote.ps1 <user> <host>
#
# What it does on the remote (one SSH round-trip):
#   1. cd ~/code/store
#   2. git checkout -- deploy.sh   — undo any local corruption
#   3. git pull                    — refresh repo + tags
#   4. sed -i 's/\r$//' deploy.sh  — strip any CRLF endings
#   5. chmod +x deploy.sh
#   6. ./deploy.sh                 — picks latest tag, falls back to dev

param(
    [Parameter(Mandatory = $true, Position = 0,
        HelpMessage = "Remote SSH username, e.g. 'shahar'")]
    [string]$Username,

    [Parameter(Mandatory = $true, Position = 1,
        HelpMessage = "Remote host or IP, e.g. '10.10.10.1' or 'ubuntu.local'")]
    [string]$Hostname
)

$ErrorActionPreference = 'Stop'
$SshTarget = "$Username@$Hostname"

Write-Host "=> Connecting to $SshTarget ..."
Write-Host ""

$RemoteScript = @'
set -e
cd code/store
git fetch origin
git checkout dev
git reset --hard origin/dev
sed -i 's/\r$//' deploy.sh
chmod +x deploy.sh
./deploy.sh
'@

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
