# Deploys the BossTalk bot on this Windows machine. Runs both as a CI step
# (self-hosted GitHub Actions runner, on push to master) and by hand if you
# ever need to redeploy outside of CI — just run it from the repo root.
#
# Assumes: packages/bot/.env already exists (gitignored, provisioned once
# manually — git pull never brings it), and the BossTalkBot NSSM service is
# already installed (one-time manual setup, not done by this script).
$ErrorActionPreference = 'Stop'

Write-Host "Installing dependencies..."
npm install
if ($LASTEXITCODE -ne 0) { throw "npm install failed" }

Write-Host "Building packages/bot..."
npm run build --workspace=packages/bot
if ($LASTEXITCODE -ne 0) { throw "build failed" }

Write-Host "Registering slash commands..."
npm run deploy-commands --workspace=packages/bot
if ($LASTEXITCODE -ne 0) { throw "deploy-commands failed" }

Write-Host "Restarting BossTalkBot service..."
Restart-Service -Name BossTalkBot

Write-Host "Done. Check status with: Get-Service BossTalkBot"
