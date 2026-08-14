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
  transcriptionProvider: 'local' | 'openai' | 'assemblyai';
  transcriptionPythonBin?: string;
  openAIApiKey?: string;
  assemblyAIApiKey?: string;
  sourceMode: 'wow-install' | 'filesystem' | 'casc-remote';
  wowInstallPath?: string;
  wowCacheDir?: string;
  soundsRootPath?: string;
  skipTranscription?: boolean;
  dryRun?: boolean;
  creatureFilter?: string;
  // Bypass the manifest-change short-circuit — run the manifest check (or skip
  // it, same as --creature) regardless of whether the listfile hash matches.
  forceManifest?: boolean;
  // Bypass the R2 diff — reprocesses every discovered sound (matching
  // creatureFilter, if set) even if already in R2. Doesn't force past the
  // manifest short-circuit on its own — combine with forceManifest (or
  // creatureFilter, which already skips it) for a full unscoped reprocess.
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

  // On Ctrl+C, Windows delivers the signal to the whole console process group
  // at once — both this process AND the Python worker child get interrupted
  // independently and simultaneously (that's why a crashed-worker warning can
  // show up right as a sync is stopping — the in-flight transcription dies on
  // its own, not because we told it to). Because of that, we can't race a
  // separate exit path against the main loop: an earlier version called
  // process.exit() directly from the signal handler while the loop's current
  // await was still resolving, which could enqueue an Algolia record *after*
  // the interrupt-triggered flush had already run, stranding it unsent. So
  // instead: just set a flag, let the in-flight file finish naturally (it'll
  // fail fast if its worker died, same as any other transcription error), and
  // let the loop stop itself and fall through to the normal finally-block
  // cleanup below — one exit path, not two.
  let interrupted = false;
  const shutdown = () => {
    if (interrupted) {
      logger.warn('Second interrupt — forcing exit.');
      process.exit(130);
    }
    interrupted = true;
    logger.warn('Interrupt received — finishing current file, then stopping. Press Ctrl+C again to force exit.');
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
    if (!config.dryRun && !config.creatureFilter) {
      if (config.forceManifest) {
        logger.info('--force-manifest — skipping the manifest-change check.');
      } else if (source instanceof WoWInstallSource) {
        const manifestChanged = await source.hasNewManifest();
        if (!manifestChanged) {
          logger.info('No new community manifest detected — nothing to do.');
          recordSyncHistory('no changes');
          return;
        }
        logger.info('New community manifest detected — running full sync.');
      }
    }

    let sounds: import('./casc/SoundSource').DiscoveredSound[];
    let totalInR2 = 0;

    if (config.dryRun) {
      sounds = await source.listSounds(config.creatureFilter);
      logger.info(`Discovered ${sounds.length} sounds (dry run — skipping R2 comparison)`);
    } else if (config.forceReindex) {
      sounds = await source.listSounds(config.creatureFilter);
      logger.info(`Discovered ${sounds.length} sounds (--force-reindex — reprocessing all, ignoring R2 diff)`);
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

    const creatureSlugOf = (fileKey: string) => fileKey.split('/').at(-2) ?? '';
    const totalCreatures = new Set(sounds.map((s) => creatureSlugOf(s.fileKey))).size;
    logger.info(`${sounds.length} sounds across ${totalCreatures} creatures to process`);

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bosstalk-'));
    let processed = 0;
    let errors = 0;
    const seenCreatures = new Set<string>();

    for (const sound of sounds) {
      if (interrupted) {
        logger.warn(`Stopping early — ${processed}/${sounds.length} processed before interrupt.`);
        break;
      }

      const creatureSlug = creatureSlugOf(sound.fileKey);
      if (!seenCreatures.has(creatureSlug)) {
        seenCreatures.add(creatureSlug);
        const pct = ((seenCreatures.size / totalCreatures) * 100).toFixed(1);
        logger.info(`→ ${creatureSlug} (creature ${seenCreatures.size}/${totalCreatures}, ${pct}%)`);
      }

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
    await algolia?.flush();
    transcription.close?.();
  }

  // Cleanup above is done, so it's safe to exit now without racing it. Needed
  // for long-lived (non-run-once) mode — otherwise an interrupted sync would
  // just fall through to starting the cron scheduler instead of actually
  // stopping.
  if (interrupted) {
    logger.warn('Exiting after interrupt.');
    process.exit(130);
  }
}
