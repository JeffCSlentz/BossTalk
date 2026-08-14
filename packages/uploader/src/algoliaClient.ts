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

  async delete(objectID: string): Promise<void> {
    await this.client.deleteObject({ indexName: INDEX_NAME, objectID });
  }

  async configureIndex(): Promise<void> {
    await this.client.setSettings({
      indexName: INDEX_NAME,
      indexSettings: {
        searchableAttributes: ['creatureName', 'transcript'],
        customRanking: ['desc(uploadedAt)'],
      },
    });
  }
}
