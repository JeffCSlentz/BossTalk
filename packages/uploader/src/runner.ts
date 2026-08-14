import os from 'os';
import path from 'path';
import fs from 'fs';
import logger, { formatError } from './logger';
import { R2Client, R2Config } from './r2Client';
import { AlgoliaClient } from './algoliaClient';
import { LocalWhisperService } from './transcription/LocalWhisperService';
import { OpenAIWhisperService } from './transcription/OpenAIWhisperService';
import { AssemblyAIService } from './transcription/AssemblyAIService';
import { FilesystemSource } from './casc/FilesystemSource';
import { CASCRemoteSource } from './casc/CASCRemoteSource';
import { WoWInstallSource } from './casc/WoWInstallSource';
import { detectNew } from './diffDetector';
import { processFile } from './enrichment/pipeline';
import { recordSyncHistory } from './syncHistory';
import type { TranscriptionService } from './transcription/TranscriptionService';
import type { SoundSource } from './casc/SoundSource';

export interface RunnerConfig {
  r2: R2Config;
  algoliaAppId: string;
  algoliaApiKey: string;
  anthropicApiKey: string;
  transcriptionProvider: 'local' | 'openai' | 'assemblyai';
  transcriptionPythonBin?: string;
  openAIApiKey?: string;
  assemblyAIApiKey?: string;
  sourceMode: 'wow-install' | 'filesystem' | 'casc-remote';
  wowInstallPath?: string;
  wowCacheDir?: string;
  soundsRootPath?: string;
  skipTranscription?: boolean;
  skipTagging?: boolean;
  dryRun?: boolean;
  creatureFilter?: string;
  // Bypass the R2 diff and manifest-change check entirely — reprocesses every
  // discovered sound (matching creatureFilter, if set) even if already in R2.
  forceReindex?: boolean;
}

function buildTranscription(config: RunnerConfig): TranscriptionService {
  switch (config.transcriptionProvider) {
    case 'openai':
      return new OpenAIWhisperService(config.openAIApiKey ?? '');
    case 'assemblyai':
      return new AssemblyAIService(config.assemblyAIApiKey ?? '');
    case 'local':
    default:
      return new LocalWhisperService(config.transcriptionPythonBin ?? 'python');
  }
}

function buildSource(config: RunnerConfig): SoundSource {
  if (config.sourceMode === 'wow-install') {
    if (!config.wowInstallPath) throw new Error('WOW_INSTALL_PATH required for wow-install source mode');
    return new WoWInstallSource(config.wowInstallPath, config.wowCacheDir);
  }
  if (config.sourceMode === 'casc-remote') {
    return new CASCRemoteSource();
  }
  if (!config.soundsRootPath) throw new Error('SOUNDS_ROOT_PATH required for filesystem source mode');
  return new FilesystemSource(config.soundsRootPath);
}

export async function runSync(config: RunnerConfig): Promise<void> {
  const r2 = config.dryRun ? undefined : new R2Client(config.r2);
  const algolia = config.dryRun ? undefined : new AlgoliaClient(config.algoliaAppId, config.algoliaApiKey);
  const transcription = buildTranscription(config);
  const source = buildSource(config);

  // Without this, a manual Ctrl+C (or the process being stopped some other
  // way) skips transcription.close() entirely — on Windows in particular, we
  // can't assume the OS will clean up the Python worker for us (see the
  // AssignProcessToJobObject flakiness we hit earlier), so an interrupted run
  // could leave a ~3GB python.exe sitting in VRAM indefinitely.
  const shutdown = () => {
    logger.warn('Sync interrupted — closing transcription worker before exit.');
    transcription.close?.();
    process.exit(130);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  try {
    const modeLabel = config.creatureFilter ? `creature=${config.creatureFilter}` : 'all creatures';
    logger.info(`Starting sync — source: ${source.name}, ${modeLabel}${config.dryRun ? ' [DRY RUN]' : ''}`);
    if (config.sourceMode === 'filesystem') logger.info(`  sounds root: ${config.soundsRootPath}`);
    if (config.sourceMode === 'wow-install') logger.info(`  wow install: ${config.wowInstallPath}`);

    // The full CASC extraction pipeline is only worth running when the community
    // listfile has actually changed since the last run — no new sounds can exist
    // otherwise. Skip this for dry runs and single-creature debug runs, where the
    // intent is to inspect current state regardless of what changed.
    if (!config.dryRun && !config.creatureFilter && !config.forceReindex && source instanceof WoWInstallSource) {
      const manifestChanged = await source.hasNewManifest();
      if (!manifestChanged) {
        logger.info('No new community manifest detected — nothing to do.');
        recordSyncHistory('no changes');
        return;
      }
      logger.info('New community manifest detected — running full sync.');
    }

    let sounds: import('./casc/SoundSource').DiscoveredSound[];
    let totalInR2 = 0;

    if (config.dryRun) {
      sounds = await source.listSounds(config.creatureFilter);
      logger.info(`Discovered ${sounds.length} sounds (dry run — skipping R2 comparison)`);
    } else if (config.forceReindex) {
      sounds = await source.listSounds(config.creatureFilter);
      logger.info(`Discovered ${sounds.length} sounds (--force — reprocessing all, ignoring R2 diff)`);
    } else {
      const diff = await detectNew(source, r2!, config.creatureFilter);
      sounds = diff.newSounds;
      totalInR2 = diff.totalInR2;
      logger.info(
        `Discovered ${diff.totalDiscovered} sounds, ${diff.totalInR2} already in R2, ${diff.newSounds.length} new`
      );
    }

    if (sounds.length === 0) {
      logger.info('Nothing to do.');
      if (!config.dryRun) recordSyncHistory('no new sounds');
      return;
    }

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bosstalk-'));
    let processed = 0;
    let errors = 0;

    for (const sound of sounds) {
      const tmpFile = path.join(tmpDir, path.basename(sound.fileKey));
      try {
        // For filesystem source, localPath is already set. For remote, we extract first.
        if (!sound.localPath) {
          await source.extractToFile(sound, tmpFile);
          sound.localPath = tmpFile;
        }

        await processFile(sound.localPath, sound.fileKey, {
          transcription,
          algolia,
          r2,
          skipTranscription: config.skipTranscription,
          skipTagging: config.skipTagging,
          dryRun: config.dryRun,
        });

        processed++;
        if (processed % 100 === 0) {
          logger.info(`${processed}/${sounds.length} processed`);
        }
      } catch (err) {
        logger.error(`Failed ${sound.fileKey}: ${formatError(err)}`);
        errors++;
      } finally {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      }
    }

    fs.rmdirSync(tmpDir);
    logger.info(`Sync complete — processed: ${processed}, errors: ${errors}`);

    if (!config.dryRun) {
      const prefix = config.forceReindex
        ? 'forced reindex, '
        : source instanceof WoWInstallSource
          ? 'new listfile, '
          : '';
      const errSuffix = errors > 0 ? `, ${errors} error${errors === 1 ? '' : 's'}` : '';
      const noun = config.forceReindex ? 'sound' : 'new sound';
      recordSyncHistory(`${prefix}${processed} ${noun}${processed === 1 ? '' : 's'} processed${errSuffix}`);
    }
  } finally {
    process.off('SIGINT', shutdown);
    process.off('SIGTERM', shutdown);
    transcription.close?.();
  }
}
