# BossTalk Uploader

Reads sound files directly from a local World of Warcraft installation, pads them with silence, uploads them to Cloudflare R2, transcribes them with Whisper, and indexes a minimal record to Algolia.

This is the **audio + transcription upload** step only. Enrichment (mood tags, expansion/zone aliases, creature images) is intentionally out of scope here — it'll be a separate pipeline that runs later over already-uploaded records, not built yet.

---

## How it works

```
WoW install (CASC)
  └─ Read local .idx archive indexes
  └─ Parse root manifest → fileDataID → content key map
  └─ Decode BLTE-compressed .ogg from data files
  └─ Some assets are BLTE-encrypted (Blizzard withholds the key until the
     tied content ships, to stop early datamining). Decryption keys are
     pulled from the community-maintained wowdev/TACTKeys list and cached
     locally (WOW_CACHE_DIR/tact-keys.txt, refreshed daily). Files whose key
     isn't published yet fail cleanly and are retried automatically once
     it's added — nothing partial ever reaches R2, so there's no separate
     recovery step needed.

For each new sound (not yet in R2):
  1. Pad audio     — sox adds 0.1s silence at start, 0.8s at end
  2. Upload        — padded .ogg → Cloudflare R2
  3. Transcribe    — faster-whisper (local GPU) or OpenAI whisper-1
  4. Index         — queued as a partial update (objectID, r2Url, creatureName,
                      creatureSlug, transcript, uploadedAt); only these fields
                      are touched, so a later enrichment pass's writes (or vice
                      versa) can't clobber each other. Batched in groups of
                      1000 rather than one write per file — flushed at the end
                      of a run, and immediately on Ctrl+C/interrupt so nothing
                      already-processed gets stranded unsent.

Filtering (both applied at discovery time, before any upload/transcribe work):
  - Generic combat SFX with no spoken line (filenames containing "attack", "wound",
    "crit", "battleshout" — see BANNED_KEYWORDS in @bosstalk/shared) are dropped.
  - Files under 4200 bytes (encoded size) are dropped as too small to contain
    useful audio — see MIN_FILE_SIZE_BYTES in @bosstalk/shared.

Diff detection:
  - Lists R2 objects under sounds/creature/, and every objectID in Algolia
  - Compares against what's in the WoW install
  - Only skips a file if it's fully done — present in *both* R2 and Algolia.
    A file that made it into R2 but not Algolia (e.g. a prior run got
    interrupted between the two writes) is treated as incomplete and retried,
    instead of being silently stuck forever.

Manifest-change short-circuit (SOURCE_MODE=wow-install only):
  - Every run first checks whether the community listfile has changed since the
    last run (cheap — no CASC parsing needed for this check alone).
  - If unchanged, the whole sync is skipped ("nothing new could exist").
  - This only applies to full, non-dry-run, all-creatures runs — --dry-run,
    --creature <slug>, and --force-manifest always run regardless.
```

The padded silence is baked into every file at upload time so the Discord bot can stream directly from R2 without needing ffmpeg at playback.

---

## Prerequisites

| Tool | Purpose | Platform |
|------|---------|----------|
| Node.js 20+ | Runtime | All |
| [sox_ng](https://codeberg.org/sox_ng/sox_ng) | Audio silence padding + format conversion | All — `winget install sox_ng.sox_ng` (Windows) or `brew install sox` (Mac). If the binary isn't on PATH, set `SOX_BIN` to its absolute path. |
| Python + [faster-whisper](https://github.com/SYSTRAN/faster-whisper) | Local transcription | Requires an NVIDIA GPU + CUDA. On Windows also `pip install nvidia-cublas-cu12 nvidia-cudnn-cu12` — the driver alone isn't enough. |
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

# Sound source
SOURCE_MODE=wow-install
WOW_INSTALL_PATH=C:\Program Files (x86)\World of Warcraft

# Transcription
SKIP_TRANSCRIPTION=false
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

Requires `ALGOLIA_APP_ID` and `ALGOLIA_ADMIN_API_KEY` to be filled in — this one actually writes to R2 and Algolia.

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

Transcription is enabled by default (`SKIP_TRANSCRIPTION=false`, `TRANSCRIPTION_PROVIDER=local`). To set it up:

1. Install [faster-whisper](https://github.com/SYSTRAN/faster-whisper):
   ```
   pip install faster-whisper
   ```
2. On Windows, the NVIDIA driver alone isn't enough — `ctranslate2` (which faster-whisper uses) needs the cuBLAS/cuDNN runtime libraries too:
   ```
   pip install nvidia-cublas-cu12 nvidia-cudnn-cu12
   ```
   `whisper_transcribe.py` registers these packages' DLL directories with Windows automatically before importing `faster_whisper` — no manual PATH changes needed.
3. Confirm it works:
   ```
   python python\whisper_transcribe.py --check
   ```

The transcription service spawns a Python subprocess using `faster-whisper large-v3` on the CUDA device, one process per file. Set `TRANSCRIPTION_PROVIDER=openai` to use OpenAI's `whisper-1` instead (requires `OPENAI_API_KEY`, costs per file, no GPU needed).

The transcript is stored on the Algolia record.

---

## CLI flags

| Flag | Description |
|------|-------------|
| `--run-once` | Run one sync then exit (instead of staying alive for cron) |
| `--dry-run` | Read and process locally, skip all R2/Algolia writes |
| `--creature <slug>` | Limit to one creature directory, e.g. `--creature murloc` |
| `--force-manifest` | Bypass the manifest-change short-circuit — run the discovery/diff step even if the community listfile hasn't changed since last run. On its own, still only processes sounds not already in R2. |
| `--force-reindex` | Bypass the R2 diff — reprocesses every discovered sound (re-transcribe, re-index) even if already in R2. Doesn't re-upload files that already exist. On its own (no `--creature`), the manifest short-circuit can still skip the run entirely if nothing changed — combine with `--force-manifest` for a full unscoped reprocess. |
