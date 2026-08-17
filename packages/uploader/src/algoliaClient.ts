import { algoliasearch } from 'algoliasearch';
import { AlgoliaRecord } from '@bosstalk/shared';
import logger from './logger';

const INDEX_NAME = 'bosstalk_sounds';
const BATCH_SIZE = 1000;

export class AlgoliaClient {
  private client: ReturnType<typeof algoliasearch>;
  private pending: AlgoliaRecord[] = [];

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
  async upsert(record: AlgoliaRecord): Promise<void> {
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

  async delete(objectID: string): Promise<void> {
    await this.client.deleteObject({ indexName: INDEX_NAME, objectID });
  }

  async configureIndex(): Promise<void> {
    await this.client.setSettings({
      indexName: INDEX_NAME,
      indexSettings: {
        searchableAttributes: ['creatureName', 'transcript'],
        customRanking: ['desc(uploadedAt)'],
        // Lets the bot dedupe autocomplete results to one hit per creature
        // via a real (ranked, typo-tolerant) search instead of searchForFacetValues.
        attributeForDistinct: 'creatureSlug',
        distinct: true,
        // creatureSlug: live-filtered "other sounds from this creature" lookups.
        // _rand: Algolia has no native random-record query; the bot picks a
        // random threshold and filters `_rand >= threshold` (wrapping around
        // on empty results) instead of holding a local copy of the catalog.
        attributesForFaceting: ['creatureSlug', '_rand'],
      },
    });
  }
}
