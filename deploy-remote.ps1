# deploy-remote.ps1 — SSH into the home server and deploy the latest release.
#
# Usage:
#   .\deploy-remote.ps1 <user> <host>
#
# The server runs deploy.sh which finds the latest git tag and deploys from it.
# Run release.ps1 first to cut a new release before deploying.

param(
    [Parameter(Mandatory = $true, Position = 0,
        HelpMessage = "Remote SSH username, e.g. 'shahar'")]
    [string]$Username,

    [Parameter(Mandatory = $true, Position = 1,
        HelpMessage = "Remote host or IP, e.g. '10.10.10.1' or 'ubuntu.local'")]
    [string]$Hostname
)

$ErrorActionPreference = "Stop"
$SshTarget = "$Username@$Hostname"

Write-Host "=> Connecting to $SshTarget ..."
Write-Host ""

$RemoteScript = @'
set -e
cd code/store
git fetch --tags origin
git checkout -- deploy.sh 2>/dev/null || true
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
