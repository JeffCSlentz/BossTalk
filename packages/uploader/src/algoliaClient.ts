import { algoliasearch } from 'algoliasearch';
import { AlgoliaRecord, InstanceType } from '@bosstalk/shared';
import { CreatureEnrichment } from './enrichment/creatureEnrichment';
import logger from './logger';

const INDEX_NAME = 'bosstalk_sounds';
const BATCH_SIZE = 1000;

// A partial-update write only needs objectID plus whichever fields this
// caller owns — the upload pipeline writes the full record, the enrichment
// pipeline writes only its own fields onto an already-existing objectID.
type PartialAlgoliaRecord = Partial<AlgoliaRecord> & { objectID: string };

export interface UnenrichedSound {
  objectID: string;
  creatureSlug: string;
  creatureName: string;
  transcript: string;
}

export class AlgoliaClient {
  private client: ReturnType<typeof algoliasearch>;
  private pending: PartialAlgoliaRecord[] = [];

  constructor(appId: string, apiKey: string) {
    this.client = algoliasearch(appId, apiKey);
  }

  // Queues a partial update — merges these fields into the existing record
  // (creating it if it doesn't exist yet) without touching any field not
  // included here, so a later enrichment pass can't accidentally wipe out
  // whatever this upload step already wrote, or vice versa.
  //
  // Queues rather than writing immediately, auto-flushing once BATCH_SIZE
  // records have queued up — far fewer round-trips than one write per file.
  // Call flush() to send whatever's left (end of a run, or on interrupt).
  async upsert(record: PartialAlgoliaRecord): Promise<void> {
    this.pending.push(record);
    if (this.pending.length >= BATCH_SIZE) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.pending.length === 0) return;
    const batch = this.pending;
    this.pending = [];
    logger.debug(`Flushing ${batch.length} record(s) to Algolia`);
    await this.client.partialUpdateObjects({
      indexName: INDEX_NAME,
      objects: batch,
      createIfNotExists: true,
      waitForTasks: true,
    });
  }

  // Full set of every objectID currently indexed — used by diffDetector to
  // check Algolia presence alongside R2 presence without a live API call per
  // file. Only pulls objectID, not full records, to keep it cheap.
  async fetchAllObjectIDs(): Promise<Set<string>> {
    const ids = new Set<string>();
    await this.client.browseObjects<{ objectID: string }>({
      indexName: INDEX_NAME,
      browseParams: { attributesToRetrieve: ['objectID'] },
      aggregator: (response) => {
        for (const hit of response.hits) ids.add(hit.objectID);
      },
    });
    return ids;
  }

  // Every sound record missing soundTypes — the marker this codebase uses
  // for "not yet enriched" (set only by the enrichment pipeline, never by
  // upload). Optionally scoped to one creature, matching the --creature
  // debug filter the upload side already supports.
  async fetchUnenriched(creatureFilter?: string): Promise<UnenrichedSound[]> {
    const records: UnenrichedSound[] = [];
    await this.client.browseObjects<UnenrichedSound & { soundTypes?: string[] }>({
      indexName: INDEX_NAME,
      browseParams: {
        attributesToRetrieve: ['objectID', 'creatureSlug', 'creatureName', 'transcript', 'soundTypes'],
        ...(creatureFilter ? { filters: `creatureSlug:"${creatureFilter}"` } : {}),
      },
      aggregator: (response) => {
        for (const hit of response.hits) {
          if (!hit.soundTypes || hit.soundTypes.length === 0) {
            records.push({
              objectID: hit.objectID,
              creatureSlug: hit.creatureSlug,
              creatureName: hit.creatureName,
              transcript: hit.transcript,
            });
          }
        }
      },
    });
    return records;
  }

  // The enrichment pipeline's cache, backed by Algolia instead of a local
  // file: looks for any sound already stamped with this creature's facts
  // (creatureEnriched:true) and reuses them, so a creature already resolved
  // is never looked up (and re-billed) again — durable across machines and
  // never lost to a wiped disk, unlike a local cache file would be.
  async fetchCreatureFacts(creatureSlug: string): Promise<CreatureEnrichment | null> {
    const res = await this.client.searchSingleIndex<Record<string, unknown>>({
      indexName: INDEX_NAME,
      searchParams: {
        filters: `creatureSlug:"${creatureSlug}" AND creatureEnriched:true`,
        hitsPerPage: 1,
        attributesToRetrieve: [
          'expansion',
          'zone',
          'instanceType',
          'creatureRole',
          'raceSpecies',
          'expansionAliases',
          'zoneAliases',
          'creatureImageUrl',
        ],
      },
    });

    const hit = res.hits[0];
    if (!hit) return null;
    return {
      expansion: (hit.expansion as string) ?? '',
      zone: (hit.zone as string) ?? '',
      instanceType: (hit.instanceType as InstanceType) ?? '',
      creatureRole: (hit.creatureRole as CreatureEnrichment['creatureRole']) ?? '',
      raceSpecies: (hit.raceSpecies as string) ?? '',
      expansionAliases: (hit.expansionAliases as string[]) ?? [],
      zoneAliases: (hit.zoneAliases as string[]) ?? [],
      imageUrl: (hit.creatureImageUrl as string) ?? '',
    };
  }

  async delete(objectID: string): Promise<void> {
    await this.client.deleteObject({ indexName: INDEX_NAME, objectID });
  }

  async configureIndex(): Promise<void> {
    await this.client.setSettings({
      indexName: INDEX_NAME,
      indexSettings: {
        // expansionAliases/zoneAliases let e.g. "ICC" match Icecrown Citadel
        // sounds without the user needing the full expansion/zone name.
        searchableAttributes: ['creatureName', 'transcript', 'expansionAliases', 'zoneAliases'],
        customRanking: ['desc(uploadedAt)'],
        // Lets the bot dedupe autocomplete results to one hit per creature
        // via a real (ranked, typo-tolerant) search instead of searchForFacetValues.
        attributeForDistinct: 'creatureSlug',
        distinct: true,
        // creatureSlug: live-filtered "other sounds from this creature" lookups.
        // _rand: Algolia has no native random-record query; the bot picks a
        // random threshold and filters `_rand >= threshold` (wrapping around
        // on empty results) instead of holding a local copy of the catalog.
        // The rest are enrichment fields exposed as facets for search filtering.
        attributesForFaceting: [
          'creatureSlug',
          '_rand',
          'expansion',
          'zone',
          'instanceType',
          'creatureRole',
          'raceSpecies',
          'soundTypes',
          'moodTags',
          'hasDialogue',
          'creatureEnriched',
        ],
      },
    });
  }
}
