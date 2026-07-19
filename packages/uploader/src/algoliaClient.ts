import { algoliasearch } from 'algoliasearch';
import { AlgoliaRecord } from '@bosstalk/shared';

const INDEX_NAME = 'bosstalk_sounds';
const BATCH_SIZE = 1000;

export class AlgoliaClient {
  private client: ReturnType<typeof algoliasearch>;

  constructor(appId: string, apiKey: string) {
    this.client = algoliasearch(appId, apiKey);
  }

  async upsert(record: AlgoliaRecord): Promise<void> {
    await this.client.saveObject({ indexName: INDEX_NAME, body: record });
  }

  async batchUpsert(records: AlgoliaRecord[]): Promise<void> {
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const chunk = records.slice(i, i + BATCH_SIZE);
      await this.client.saveObjects({ indexName: INDEX_NAME, objects: chunk });
    }
  }

  async delete(objectID: string): Promise<void> {
    await this.client.deleteObject({ indexName: INDEX_NAME, objectID });
  }

  async configureIndex(): Promise<void> {
    await this.client.setSettings({
      indexName: INDEX_NAME,
      indexSettings: {
        searchableAttributes: [
          'creatureName',
          'transcript',
          'zone',
          'zoneAliases',
          'expansion',
          'expansionAliases',
          'tags',
          'category',
        ],
        attributesForFaceting: ['expansion', 'instanceType', 'category', 'tags'],
        customRanking: ['desc(uploadedAt)'],
      },
    });
  }
}
