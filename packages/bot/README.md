# BossTalk Bot

The Discord bot. Runs on this Windows machine (same box as `packages/uploader`),
not a remote VPS. It reads sound data live from Algolia and streams audio
directly from R2 — no local sound files, no local database.

## One-time setup

1. Copy `.env.example` to `.env` and fill in `DISCORD_TOKEN`/`DISCORD_CLIENT_ID`/
   `DISCORD_GUILD_ID`, an Algolia **search-only** key (not the uploader's admin
   key), and R2 credentials.
2. Build (from the repo root): `npm install && npm run build --workspace=packages/bot`
3. Register slash commands: `npm run deploy-commands --workspace=packages/bot`
   (`NODE_ENV=development` registers guild-scoped commands against
   `DISCORD_GUILD_ID` for fast iteration; `production` registers global
   commands instead).
4. Install as a Windows service via [NSSM](https://nssm.cc/):
   ```
   nssm install BossTalkBot "<path to node.exe>" "packages\bot\dist\index.js"
   ```
   Set `AppDirectory` to this folder (`packages/bot`) — `loadEnv.ts` and the
   logger resolve paths relative to it, so this matters. Set the service to
   start automatically so it survives reboots.

## Running locally for testing

From the repo root:
```
npm run dev --workspace=packages/bot
```
or from this folder:
```
npm run dev
```

Uses the same `.env` as the service does. Make sure `NODE_ENV=development` and
`DISCORD_GUILD_ID` are set first (see setup step 3) so slash commands are
registered to your test guild and show up immediately, and stop it with
Ctrl+C — the `stats`/`guildTags` services flush on `SIGINT` so you won't lose
anything mid-session.

**Ctrl+C is unreliable on Windows** for a process launched via `npm run dev`
(signal propagation through npm → ts-node is a known flaky spot) — it can
leave an orphaned process still connected to Discord, which shows up as every
command running twice and `Unknown interaction` errors on replies. If that
happens, run `./stop-dev.ps1` from this folder (or `Get-Process node` to check
manually) before starting a new session.

## Day to day

- Logs: `logs/` (daily-rotated), or `Get-Content` them, or `nssm status
  BossTalkBot` / `Get-Service BossTalkBot` for service state.
- Manual redeploy without CI: run `./deploy.ps1` from the repo root — it
  builds, re-registers commands, and restarts the service.
- Automatic redeploy: a self-hosted GitHub Actions runner on this machine
  runs `deploy.ps1` on every push to `master` (see
  `.github/workflows/deploy_boss_talk.yml`). Install the runner once via
  GitHub's own instructions (Settings → Actions → Runners → New self-hosted
  runner), then install it as its own Windows service via the runner's
  `svc install`/`svc start`.

### Common issues

- No `@discordjs/opus`/ffmpeg needed anymore — sounds stream from R2 as
  pre-padded Ogg/Opus and pass straight through `@discordjs/voice`.
- If the service can't find `.env` or writes logs to the wrong place, check
  NSSM's `AppDirectory` is set to this folder, not the repo root.
- `npm run migrate-guild-tags -- <path>` — one-time script to convert an old
  `guildTags.json` (from the pre-R2 bot) to the new format. Run against a
  **copy**, never the live file.
- `npm run find-pictures` — the creature-thumbnail scraper (`scripts/findPictures.ts`),
  run occasionally by hand, not part of the bot process.
