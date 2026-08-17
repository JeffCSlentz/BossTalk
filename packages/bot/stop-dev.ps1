# Ctrl+C doesn't reliably kill `npm run dev` on Windows — it has to propagate
# through npm -> ts-node, a known flaky spot in Node's process handling, and
# it can leave an orphaned process still connected to Discord. Run this
# instead of trusting Ctrl+C, or after it if you're not sure it worked.
# Scoped to this bot's own process (matches on "ts-node" + "index.ts" in the
# command line) so it won't touch VS Code's own node.exe helper processes.
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
  Where-Object { $_.CommandLine -match 'ts-node' -and $_.CommandLine -match 'index\.ts' } |
  ForEach-Object {
    Write-Host "Stopping PID $($_.ProcessId): $($_.CommandLine)"
    Stop-Process -Id $_.ProcessId -Force
  }

Write-Host "Done. Remaining node processes:"
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Select-Object ProcessId, CommandLine
