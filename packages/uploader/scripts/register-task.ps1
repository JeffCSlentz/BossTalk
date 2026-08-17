# Registers BossTalk Uploader as a Windows Scheduled Task.
# Run once from an elevated PowerShell prompt:
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   .\scripts\register-task.ps1
#
# The task runs daily at 3am and on system startup.
# Logs go to logs\uploader\ relative to the repo root.

param(
    [string]$TaskName    = "BossTalk Uploader",
    [string]$RepoRoot    = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path,
    [string]$NodeBin     = (Get-Command node).Source,
    [string]$Time        = "03:00"
)

$scriptDir = Join-Path $RepoRoot "packages\uploader"
$entryPoint = Join-Path $scriptDir "dist\index.js"

if (-not (Test-Path $entryPoint)) {
    Write-Error "dist\index.js not found. Run 'npm run build' in packages\uploader first."
    exit 1
}

$action = New-ScheduledTaskAction `
    -Execute $NodeBin `
    -Argument "$entryPoint --run-once" `
    -WorkingDirectory $RepoRoot

$triggers = @(
    $(New-ScheduledTaskTrigger -Daily -At $Time),
    $(New-ScheduledTaskTrigger -AtStartup)
)

$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Hours 6) `
    -RestartCount 2 `
    -RestartInterval (New-TimeSpan -Minutes 10) `
    -StartWhenAvailable

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $triggers `
    -Settings $settings `
    -RunLevel Highest `
    -Force | Out-Null

Write-Host "Registered task '$TaskName'. Runs daily at $Time and on startup."
Write-Host "To run immediately: Start-ScheduledTask -TaskName '$TaskName'"
Write-Host "To view logs: Get-Content '$RepoRoot\logs\uploader\*.log' -Tail 50"
