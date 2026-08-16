import fs from 'fs';
import path from 'path';
import { AlgoliaRecord, objectIDFromFileKey } from '@bosstalk/shared';
import { TranscriptionService } from '../transcription/TranscriptionService';
import { AlgoliaClient } from '../algoliaClient';
import { R2Client } from '../r2Client';
import { padAudio, cleanupPadded } from './padAudio';
import logger, { formatError } from '../logger';

// Whisper (local and OpenAI) hallucinate these on non-speech audio — silence,
// roars, growls — instead of returning an empty transcript. Filter them out so
// they don't get indexed as if they were real dialogue.
const HALLUCINATION_EXACT = ['thanks for watching!', 'thanks for watching', 'thank you for watching!', 'thank you for watching'];
const HALLUCINATION_SUBSTRINGS = [
  'translation by',
  'translated by',
  'transcription by',
  'transcribed by',
  'subscribe',
  'subtitles by',
  'captioning by',
  'captioning provided by',
  'amara.org',
  'living or dead, is coincidental',
  "we'll be right back",
  'welcome back to my channel',
];

function isHallucinatedTranscript(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;
  if (HALLUCINATION_EXACT.includes(normalized)) return true;
  return HALLUCINATION_SUBSTRINGS.some((phrase) => normalized.includes(phrase));
}

export interface PipelineConfig {
  transcription: TranscriptionService;
  algolia?: AlgoliaClient;
  r2?: R2Client;
  skipTranscription?: boolean;
  dryRun?: boolean;
}

export interface PipelineResult {
  fileKey: string;
  record: AlgoliaRecord;
  uploaded: boolean;
}

export async function processFile(
  localPath: string,
  fileKey: string,
  config: PipelineConfig
): Promise<PipelineResult> {
  const creatureSlug = fileKey.split('/').at(-2) ?? '';
  const creatureName = slugToDisplayName(creatureSlug);
  const now = Math.floor(Date.now() / 1000);

  const record: AlgoliaRecord = {
    objectID: objectIDFromFileKey(fileKey),
    r2Url: config.r2?.publicUrl(fileKey) ?? `https://cdn.bosstalk.io/${fileKey}`,
    creatureName,
    creatureSlug,
    transcript: '',
    durationSeconds: 0,
    uploadedAt: now,
    _rand: Math.random(),
  };

  // 1. Pad audio with silence (0.1s start, 0.8s end) then upload to R2
  let uploaded = false;
  const paddedPath = await padAudio(localPath);
  const paddedBytes = fs.statSync(paddedPath).size;
  try {
    if (config.dryRun) {
      logger.info(`[dry-run] sox OK → ${fileKey} (${paddedBytes} bytes padded)`);
    } else {
      const alreadyExists = await config.r2!.exists(fileKey);
      if (!alreadyExists) {
        await config.r2!.upload(paddedPath, fileKey);
        uploaded = true;
        logger.debug(`${fileKey} → uploaded to R2 (${paddedBytes} bytes padded)`);
      } else {
        logger.debug(`${fileKey} → already in R2, skipped upload`);
      }
    }
  } finally {
    cleanupPadded(paddedPath);
  }

  // 2. Transcribe (runs against original unpadded file)
  if (!config.skipTranscription && !config.dryRun) {
    try {
      const result = await config.transcription.transcribe(localPath);
      if (isHallucinatedTranscript(result.text)) {
        record.transcript = '';
        logger.debug(`${fileKey} → discarded hallucinated transcript: "${result.text}"`);
      } else {
        record.transcript = result.text;
      }
    } catch (err) {
      record.transcript = '';
      logger.warn(`${fileKey} → transcription failed: ${formatError(err)}`);
    }
    logger.info(`${fileKey} → "${record.transcript || '(no speech detected)'}"`);
  }

  // 3. Index to Algolia
  if (config.dryRun) {
    logger.info(`[dry-run] Would index: ${record.objectID}`);
  } else {
    await config.algolia!.upsert(record);
    logger.debug(`${fileKey} → indexed to Algolia`);
  }

  return { fileKey, record, uploaded };
}

function slugToDisplayName(slug: string): string {
  return slug
    .replace(/^\d+xp_/, '')
    .replace(/_/g, ' ')
    .replace(/\d+$/, '')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
