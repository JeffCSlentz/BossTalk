import path from 'path';
import dotenv from 'dotenv';
import type { RunnerConfig } from './runner';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

function require_env(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function optional_env(key: string, fallback = ''): string {
  return process.env[key] ?? fallback;
}

export function loadConfig(opts: { dryRun?: boolean } = {}): RunnerConfig & { cron: string } {
  // In dry-run mode external service credentials are not needed
  const req = opts.dryRun ? optional_env : require_env;

  return {
    r2: {
      accountId: req('R2_ACCOUNT_ID'),
      accessKeyId: req('R2_ACCESS_KEY_ID'),
      secretAccessKey: req('R2_SECRET_ACCESS_KEY'),
      bucket: optional_env('R2_BUCKET', 'bosstalk-sounds'),
      publicUrl: optional_env('R2_PUBLIC_URL', 'https://cdn.bosstalk.io'),
    },
    algoliaAppId: req('ALGOLIA_APP_ID'),
    algoliaApiKey: req('ALGOLIA_ADMIN_API_KEY'),
    transcriptionProvider: (optional_env('TRANSCRIPTION_PROVIDER', 'local') as 'local' | 'openai' | 'assemblyai'),
    transcriptionPythonBin: optional_env('TRANSCRIPTION_PYTHON_BIN', 'python'),
    openAIApiKey: optional_env('OPENAI_API_KEY'),
    assemblyAIApiKey: optional_env('ASSEMBLYAI_API_KEY'),
    sourceMode: (optional_env('SOURCE_MODE', 'wow-install') as 'wow-install' | 'filesystem' | 'casc-remote'),
    wowInstallPath: optional_env('WOW_INSTALL_PATH'),
    wowCacheDir: optional_env('WOW_CACHE_DIR'),
    soundsRootPath: optional_env('SOUNDS_ROOT_PATH'),
    skipTranscription: optional_env('SKIP_TRANSCRIPTION', 'false') === 'true',
    cron: optional_env('SCHEDULER_CRON', '0 3 * * *'),
  };
}
