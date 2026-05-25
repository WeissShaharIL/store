param([Parameter(Mandatory)][string]$Message)

$branch = git rev-parse --abbrev-ref HEAD
if ($branch -ne "dev") {
    Write-Host "ERROR: gitme must be run from the 'dev' branch (currently on '$branch')" -ForegroundColor Red
    exit 1
}

git add -A
git update-index --chmod=+x deploy.sh 2>$null
git commit -m $Message
git push
