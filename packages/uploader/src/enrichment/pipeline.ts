import fs from 'fs';
import path from 'path';
import { AlgoliaRecord, objectIDFromFileKey } from '@bosstalk/shared';
import { TranscriptionService } from '../transcription/TranscriptionService';
import { AlgoliaClient } from '../algoliaClient';
import { R2Client } from '../r2Client';
import { categorizeFromPath } from './categorize';
import { generateTags } from './tagGenerator';
import { fetchCreatureImage } from './creatureImage';
import { padAudio, cleanupPadded } from './padAudio';
import logger from '../logger';

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
  enriched: boolean;
  error?: string;
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
    fileKey,
    r2Url: config.r2?.publicUrl(fileKey) ?? `https://cdn.bosstalk.io/${fileKey}`,
    creatureName,
    creatureSlug,
    creatureImageUrl: '',
    transcript: '',
    expansion: '',
    expansionAliases: [],
    zone: '',
    zoneAliases: [],
    instanceType: '',
    category: categorizeFromPath(fileKey),
    tags: [],
    durationSeconds: 0,
    enrichedAt: 0,
    uploadedAt: now,
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
      }
    }
  } finally {
    cleanupPadded(paddedPath);
  }

  // 2. Transcribe (runs against original unpadded file)
  let enriched = false;
  if (!config.skipTranscription && !config.dryRun) {
    try {
      const result = await config.transcription.transcribe(localPath);
      record.transcript = result.text;
    } catch {
      record.transcript = '';
    }
  }

  // 3. Creature image
  if (!config.dryRun) {
    try {
      const img = await fetchCreatureImage(creatureSlug);
      record.creatureImageUrl = img.imageUrl;
    } catch {
      // non-fatal
    }
  }

  // 4. AI tag generation
  if (!config.dryRun) {
    try {
      const enrichment = await generateTags({
        creatureName,
        transcript: record.transcript,
        expansion: record.expansion,
        zone: record.zone,
        category: record.category,
      });
      record.tags = enrichment.tags;
      record.expansionAliases = enrichment.expansionAliases;
      record.zoneAliases = enrichment.zoneAliases;
      record.category = enrichment.category;
      record.enrichedAt = Math.floor(Date.now() / 1000);
      enriched = true;
    } catch {
      // Upsert with partial data rather than failing
    }
  }

  // 5. Index to Algolia
  if (config.dryRun) {
    logger.info(`[dry-run] Would index: ${record.objectID} (category: ${record.category})`);
  } else {
    await config.algolia!.upsert(record);
  }

  return { fileKey, record, uploaded, enriched };
}

function slugToDisplayName(slug: string): string {
  return slug
    .replace(/^\d+xp_/, '')
    .replace(/_/g, ' ')
    .replace(/\d+$/, '')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
