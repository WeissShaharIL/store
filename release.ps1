# release.ps1 - merge dev into main, tag a new release, publish to GitHub.
#
# Usage:
#   .\release.ps1              # bumps patch:  v1.2.3 -> v1.2.4
#   .\release.ps1 minor        # bumps minor:  v1.2.3 -> v1.3.0
#   .\release.ps1 major        # bumps major:  v1.2.3 -> v2.0.0
#
# Requires: git, gh (GitHub CLI, authenticated)

param(
    [ValidateSet("major", "minor", "patch")]
    [string]$Bump = "patch"
)

$ErrorActionPreference = "Stop"

# 1. Must be on dev and clean
$branch = git rev-parse --abbrev-ref HEAD
if ($branch -ne "dev") {
    Write-Host "ERROR: release must be run from 'dev' (currently on '$branch')" -ForegroundColor Red
    exit 1
}

$dirty = git status --porcelain
if ($dirty) {
    Write-Host "ERROR: working tree is dirty - commit or stash changes first" -ForegroundColor Red
    exit 1
}

git pull origin dev

# 2. Compute next version
$latestTag = ""
try { $latestTag = git describe --tags --abbrev=0 2>$null } catch {}
if (-not $latestTag) { $latestTag = "v0.0.0" }

$parts = $latestTag.TrimStart("v").Split(".")
$major = [int]$parts[0]
$minor = [int]$parts[1]
$patch = [int]$parts[2]

switch ($Bump) {
    "major" { $major++; $minor = 0; $patch = 0 }
    "minor" { $minor++; $patch = 0 }
    "patch" { $patch++ }
}

$newTag = "v$major.$minor.$patch"
Write-Host "=> Releasing $latestTag -> $newTag"

# 3. Changelog from commits since last tag
if ($latestTag -eq "v0.0.0") {
    $logRange = "HEAD"
} else {
    $logRange = "$latestTag..HEAD"
}

$logLines = git log $logRange --oneline --no-merges 2>$null
if (-not $logLines) { $logLines = @("No changes.") }
$changelogText = ($logLines -join "`n")

# 4. Merge dev into main
Write-Host "=> Merging dev into main..."
git checkout main
git pull origin main
git merge dev --no-ff -m "release: merge dev for $newTag"

# 5. Write release.json
$now = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
$json = "{`n  `"version`": `"$newTag`",`n  `"released_at`": `"$now`",`n  `"notes`": $(($changelogText | ConvertTo-Json))`n}"
[System.IO.File]::WriteAllText("$PSScriptRoot\release.json", $json, [System.Text.Encoding]::UTF8)

git add release.json
git commit -m "release: $newTag"

# 6. Tag and push
Write-Host "=> Creating tag $newTag..."
git tag -a $newTag -m "Release $newTag"
git push origin main
git push origin $newTag

# 7. GitHub release
Write-Host "=> Creating GitHub release..."
gh release create $newTag --title $newTag --notes $changelogText

# 8. Back to dev
git checkout dev

Write-Host ""
Write-Host "=> Done. Released $newTag." -ForegroundColor Green
Write-Host "   Run .\deploy-remote.ps1 <user> <host> to deploy it."
