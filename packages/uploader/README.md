# BossTalk Uploader

Reads sound files directly from a local World of Warcraft installation, pads them with silence, uploads them to Cloudflare R2, transcribes them with Whisper, and indexes them to Algolia with AI-generated tags.

---

## How it works

```
WoW install (CASC)
  └─ Read local .idx archive indexes
  └─ Parse root manifest → fileDataID → content key map
  └─ Decode BLTE-compressed .ogg from data files

For each new sound (not yet in R2):
  1. Pad audio     — sox adds 0.1s silence at start, 0.8s at end
  2. Upload        — padded .ogg → Cloudflare R2
  3. Transcribe    — faster-whisper (local GPU, Windows only)
  4. Creature image — fetched from WoWHead
  5. AI tags       — Claude generates tags, expansion/zone aliases
  6. Index         — Algolia record upserted

Diff detection:
  - Lists R2 objects under sounds/creature/
  - Compares against what's in the WoW install
  - Only processes files not already in R2
```

The padded silence is baked into every file at upload time so the Discord bot can stream directly from R2 without needing ffmpeg at playback.

---

## Prerequisites

| Tool | Purpose | Platform |
|------|---------|----------|
| Node.js 20+ | Runtime | All |
| [SOX](https://sox.sourceforge.net/) | Audio silence padding | All — `winget install sox` or `brew install sox` |
| Python + [faster-whisper](https://github.com/SYSTRAN/faster-whisper) | Transcription | Windows (GPU machine) — optional |
| World of Warcraft retail install | Sound source | Windows (or Mac for dev) |

---

## Setup

### 1. Install dependencies

```
npm install
npm run build
```

### 2. Configure `.env`

Copy `.env.example` to `.env` and fill in the values:

```env
# Cloudflare R2
R2_ACCOUNT_ID=         # hex string from the R2 dashboard URL
R2_ACCESS_KEY_ID=      # from R2 → Manage R2 API Tokens (NOT a global API token)
R2_SECRET_ACCESS_KEY=  # same token creation flow
R2_BUCKET=bosstalk-sounds
R2_PUBLIC_URL=         # e.g. https://pub-<hash>.r2.dev or your custom domain

# Algolia
ALGOLIA_APP_ID=
ALGOLIA_ADMIN_API_KEY=

# Anthropic (AI tag generation)
ANTHROPIC_API_KEY=     # from platform.anthropic.com — separate from claude.ai subscription

# Sound source
SOURCE_MODE=wow-install
WOW_INSTALL_PATH=C:\Program Files (x86)\World of Warcraft

# Transcription (skip on first run, enable once faster-whisper is installed)
SKIP_TRANSCRIPTION=true
TRANSCRIPTION_PROVIDER=local
TRANSCRIPTION_PYTHON_BIN=python
```

**R2 token note:** The Access Key ID and Secret Access Key must come from
**R2 → Manage R2 API Tokens** in the Cloudflare dashboard, not from your profile's global API tokens. Set permissions to *Object Read & Write* on the `bosstalk-sounds` bucket.

**R2 public URL:** Enable public access on the bucket under *Settings → Public Access*
to get a `pub-<hash>.r2.dev` URL, or configure a custom domain there.

### 3. Test with a single creature (dry run)

```
node dist/index.js --dry-run --run-once --creature murloc
```

This reads from WoW, pads audio locally, and logs what it *would* upload — without touching R2 or Algolia.

### 4. Full run for one creature

```
node dist/index.js --run-once --creature murloc
```

### 5. Full run (all creatures)

```
node dist/index.js --run-once
```

Expects ~190,000 sounds on first run. Subsequent runs only process files not already in R2.

---

## Scheduling on Windows

Register a Windows Scheduled Task that runs daily at 3am and on system startup:

```powershell
# Run from an elevated PowerShell prompt
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\register-task.ps1
```

The task runs `node dist/index.js --run-once` from the repo root.

**Options:**

```powershell
# Custom time or task name
.\scripts\register-task.ps1 -Time "02:00" -TaskName "BossTalk Nightly"

# Trigger immediately after registering
Start-ScheduledTask -TaskName "BossTalk Uploader"

# Remove the task
Unregister-ScheduledTask -TaskName "BossTalk Uploader" -Confirm:$false
```

---

## Log files

Logs are written to `logs/uploader/` relative to wherever you run the process from (the repo root when using the scheduled task).

| File | Contents |
|------|----------|
| `logs/uploader/uploader-YYYY-MM-DD.log` | Full run log for that day |

- Logs rotate daily and are kept for **30 days**, then deleted automatically.
- Files older than 1 day are gzip-compressed to save space.
- The console and log file always receive the same output.
- Set `LOG_LEVEL=debug` in `.env` for verbose output (CASC parsing details, per-file timings).

**Tail today's log on Windows:**

```powershell
Get-Content logs\uploader\uploader-$(Get-Date -Format 'yyyy-MM-dd').log -Wait
```

---

## Transcription (Windows, GPU)

Transcription is disabled by default (`SKIP_TRANSCRIPTION=true`). To enable it:

1. Install [faster-whisper](https://github.com/SYSTRAN/faster-whisper):
   ```
   pip install faster-whisper
   ```
2. Set in `.env`:
   ```env
   SKIP_TRANSCRIPTION=false
   TRANSCRIPTION_PROVIDER=local
   TRANSCRIPTION_PYTHON_BIN=python
   ```

The transcription service spawns a Python subprocess using `faster-whisper large-v3` on the CUDA device. The transcript feeds into AI tag generation and is stored on the Algolia record.

---

## CLI flags

| Flag | Description |
|------|-------------|
| `--run-once` | Run one sync then exit (instead of staying alive for cron) |
| `--dry-run` | Read and process locally, skip all R2/Algolia writes |
| `--creature <slug>` | Limit to one creature directory, e.g. `--creature murloc` |
