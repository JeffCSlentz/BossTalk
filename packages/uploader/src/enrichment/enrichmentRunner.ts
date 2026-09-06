import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { AlgoliaClient, UnenrichedSound } from '../algoliaClient';
import { enrichCreature, CreatureEnrichment } from './creatureEnrichment';
import { buildSoundBatchParams, parseSoundBatchResult, SOUND_BATCH_SIZE, SoundBatchItem, CreatureContext } from './soundTagger';
import logger, { formatError } from '../logger';

const anthropicClient = new Anthropic();

// packages/uploader/src/enrichment -> packages/bot/data/picUrls.json
const PIC_URLS_PATH = path.join(__dirname, '..', '..', '..', 'bot', 'data', 'picUrls.json');
const PENDING_BATCH_PATH = path.join(__dirname, '..', '..', 'data', 'pendingSoundBatch.json');
const POLL_INTERVAL_MS = 30_000;

interface CreatureImage {
  img_url: string;
  wrong_pic_votes: number;
}

function loadFallbackImage(creatureName: string): string {
  if (!fs.existsSync(PIC_URLS_PATH)) return '';
  const raw: [string, CreatureImage[]][] = JSON.parse(fs.readFileSync(PIC_URLS_PATH, 'utf8'));
  const entry = raw.find(([name]) => name === creatureName);
  return entry?.[1]?.[0]?.img_url ?? '';
}

// Everything needed to turn one batch chunk's results back into Algolia
// upserts, persisted to disk so an interrupted/restarted run resumes polling
// the already-submitted batch instead of resubmitting (and re-paying for) it.
// Not scoped per --creature filter — a stale pending batch from a prior
// unfiltered run should be let to finish before starting a new one.
interface PendingChunk {
  objectIDs: string[];
  creatureImageUrl: string;
  creature: Omit<CreatureEnrichment, 'imageUrl'>;
}

interface PendingBatchState {
  batchId: string;
  chunks: Record<string, PendingChunk>;
}

function loadPendingBatch(): PendingBatchState | null {
  if (!fs.existsSync(PENDING_BATCH_PATH)) return null;
  return JSON.parse(fs.readFileSync(PENDING_BATCH_PATH, 'utf8'));
}

function savePendingBatch(state: PendingBatchState): void {
  fs.mkdirSync(path.dirname(PENDING_BATCH_PATH), { recursive: true });
  fs.writeFileSync(PENDING_BATCH_PATH, JSON.stringify(state));
}

function clearPendingBatch(): void {
  if (fs.existsSync(PENDING_BATCH_PATH)) fs.unlinkSync(PENDING_BATCH_PATH);
}

function groupByCreature(sounds: UnenrichedSound[]): Map<string, UnenrichedSound[]> {
  const byCreature = new Map<string, UnenrichedSound[]>();
  for (const sound of sounds) {
    const list = byCreature.get(sound.creatureSlug) ?? [];
    list.push(sound);
    byCreature.set(sound.creatureSlug, list);
  }
  return byCreature;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface EnrichmentRunConfig {
  algoliaAppId: string;
  algoliaApiKey: string;
  creatureFilter?: string;
}

export async function runEnrichment(config: EnrichmentRunConfig): Promise<void> {
  const algolia = new AlgoliaClient(config.algoliaAppId, config.algoliaApiKey);

  let pending = loadPendingBatch();
  if (pending) {
    logger.info(`Resuming pending sound-tagging batch ${pending.batchId} from a previous run`);
  } else {
    pending = await buildAndSubmitBatch(algolia, config);
    if (!pending) {
      logger.info('Nothing to enrich.');
      return;
    }
  }

  await pollAndApplyBatch(algolia, pending);
  await algolia.flush();
  clearPendingBatch();
  logger.info('Enrichment complete.');
}

async function buildAndSubmitBatch(
  algolia: AlgoliaClient,
  config: EnrichmentRunConfig
): Promise<PendingBatchState | null> {
  const unenriched = await algolia.fetchUnenriched(config.creatureFilter);
  if (unenriched.length === 0) return null;

  const byCreature = groupByCreature(unenriched);
  logger.info(`${unenriched.length} sounds across ${byCreature.size} creatures to enrich`);

  const requests: { custom_id: string; params: Anthropic.MessageCreateParamsNonStreaming }[] = [];
  const chunks: Record<string, PendingChunk> = {};
  let creaturesDone = 0;

  for (const [creatureSlug, sounds] of byCreature) {
    creaturesDone++;
    const creatureName = sounds[0].creatureName;
    logger.info(`→ ${creatureName} (creature ${creaturesDone}/${byCreature.size})`);

    let creature: CreatureEnrichment;
    const existing = await algolia.fetchCreatureFacts(creatureSlug);
    if (existing) {
      logger.info(`  reusing facts already stamped on ${creatureName}'s other sounds`);
      creature = existing;
    } else {
      try {
        const sampleTranscripts = sounds.map((s) => s.transcript).filter(Boolean).slice(0, 5);
        creature = await enrichCreature({ creatureSlug, creatureName, sampleTranscripts });
      } catch (err) {
        logger.error(`Failed to enrich creature ${creatureName}: ${formatError(err)}`);
        continue;
      }
    }

    const creatureImageUrl = creature.imageUrl || loadFallbackImage(creatureName);
    const context: CreatureContext = {
      creatureName,
      expansion: creature.expansion,
      zone: creature.zone,
      instanceType: creature.instanceType,
      creatureRole: creature.creatureRole,
    };
    const { imageUrl: _imageUrl, ...creatureFacts } = creature;

    for (let i = 0; i < sounds.length; i += SOUND_BATCH_SIZE) {
      const batchSounds: SoundBatchItem[] = sounds
        .slice(i, i + SOUND_BATCH_SIZE)
        .map((s) => ({ objectID: s.objectID, transcript: s.transcript }));
      const customId = `${creatureSlug}__${i / SOUND_BATCH_SIZE}`;

      requests.push({ custom_id: customId, params: buildSoundBatchParams(context, batchSounds) });
      chunks[customId] = {
        objectIDs: batchSounds.map((s) => s.objectID),
        creatureImageUrl,
        creature: creatureFacts,
      };
    }
  }

  if (requests.length === 0) {
    logger.info('No sounds queued for tagging — every creature failed enrichment.');
    return null;
  }

  logger.info(
    `Submitting ${requests.length} sound-tagging batch requests covering ${Object.values(chunks).reduce((n, c) => n + c.objectIDs.length, 0)} sounds (Message Batches API — ~50% cheaper, processes async)`
  );
  const batch = await anthropicClient.messages.batches.create({ requests });
  const state: PendingBatchState = { batchId: batch.id, chunks };
  savePendingBatch(state);
  return state;
}

async function pollAndApplyBatch(algolia: AlgoliaClient, pending: PendingBatchState): Promise<void> {
  let batch = await anthropicClient.messages.batches.retrieve(pending.batchId);
  while (batch.processing_status !== 'ended') {
    const { processing, succeeded, errored, canceled, expired } = batch.request_counts;
    const total = processing + succeeded + errored + canceled + expired;
    logger.info(
      `Batch ${pending.batchId}: ${batch.processing_status} (${succeeded + errored + canceled + expired}/${total} settled) — checking again in ${POLL_INTERVAL_MS / 1000}s`
    );
    await sleep(POLL_INTERVAL_MS);
    batch = await anthropicClient.messages.batches.retrieve(pending.batchId);
  }
  logger.info(
    `Batch complete — succeeded: ${batch.request_counts.succeeded}, errored: ${batch.request_counts.errored}, expired: ${batch.request_counts.expired}, canceled: ${batch.request_counts.canceled}`
  );

  for await (const entry of await anthropicClient.messages.batches.results(pending.batchId)) {
    const chunk = pending.chunks[entry.custom_id];
    if (!chunk) continue;

    if (entry.result.type !== 'succeeded') {
      logger.error(`Batch chunk ${entry.custom_id} did not succeed: ${entry.result.type}`);
      continue;
    }

    const tags = parseSoundBatchResult(entry.result.message, chunk.objectIDs);
    for (const objectID of chunk.objectIDs) {
      const tag = tags.get(objectID);
      if (!tag) {
        logger.error(`No tag result for ${objectID} in batch chunk ${entry.custom_id}`);
        continue;
      }

      await algolia.upsert({
        objectID,
        ...chunk.creature,
        creatureImageUrl: chunk.creatureImageUrl,
        creatureEnriched: true,
        soundTypes: tag.soundTypes,
        moodTags: tag.moodTags,
        hasDialogue: tag.hasDialogue,
      });
    }
  }
}
