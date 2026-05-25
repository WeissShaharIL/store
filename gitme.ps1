param([Parameter(Mandatory)][string]$Message)
git add -A
git update-index --chmod=+x deploy.sh 2>$null
git commit -m $Message
git push
