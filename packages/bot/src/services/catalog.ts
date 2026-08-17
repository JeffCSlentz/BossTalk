import { algoliasearch } from 'algoliasearch';
import { AlgoliaRecord } from '@bosstalk/shared';

const INDEX_NAME = 'bosstalk_sounds';
// Replica sorted ascending by `_rand`, dedicated to the random-pick recipe below.
// Querying the primary index with just a `_rand >= threshold` filter and no sort
// would fall back to the primary's own ranking (desc(uploadedAt)) to break ties —
// i.e. "random" would really just mean "most recently uploaded match".
const RAND_INDEX_NAME = 'bosstalk_sounds_rand';

// No bulk local cache — every lookup queries Algolia live. The one thing
// Algolia can't do natively is "give me a random record"; that's solved with
// a `_rand` field + filter (Algolia's own recommended recipe), not a local
// mirror of the ~124k-record catalog. See the plan doc for the full rationale.
export interface CatalogEntry {
  objectID: string;
  r2Url: string;
  creatureName: string;
  creatureSlug: string;
  transcript: string;
  creatureImageUrl?: string;
}

function toCatalogEntry(hit: AlgoliaRecord & { objectID: string }): CatalogEntry {
  return {
    objectID: hit.objectID,
    r2Url: hit.r2Url,
    creatureName: hit.creatureName,
    creatureSlug: hit.creatureSlug,
    transcript: hit.transcript ?? '',
    creatureImageUrl: hit.creatureImageUrl,
  };
}

export class Catalog {
  private client: ReturnType<typeof algoliasearch>;

  constructor(appId: string, apiKey: string) {
    this.client = algoliasearch(appId, apiKey);
  }

  /** Picks a uniformly random sound via Algolia's `_rand` filter recipe. */
  async random(): Promise<CatalogEntry | null> {
    const threshold = Math.random();
    return (await this.randomFiltered(`_rand >= ${threshold}`)) ?? (await this.randomFiltered(`_rand < ${threshold}`));
  }

  private async randomFiltered(filters: string): Promise<CatalogEntry | null> {
    // distinct:false overrides the index-level default (set for autocomplete's
    // benefit) — without it every query against this index gets deduped by
    // creatureSlug, which is harmless here (hitsPerPage:1) but not in byCreature.
    const { results } = await this.client.search<AlgoliaRecord>({
      requests: [{ indexName: RAND_INDEX_NAME, query: '', filters, hitsPerPage: 1, distinct: false }],
    });
    const hits = this.hitsFrom(results[0]);
    return hits[0] ? toCatalogEntry(hits[0]) : null;
  }

  /** Every sound belonging to one creature — typically a handful to a few dozen. */
  async byCreature(creatureSlug: string): Promise<CatalogEntry[]> {
    // distinct:false is required here — the index defaults to deduping by
    // creatureSlug (for autocomplete), which would otherwise collapse every
    // result of this creatureSlug-filtered query down to a single hit.
    const { results } = await this.client.search<AlgoliaRecord>({
      requests: [{ indexName: INDEX_NAME, query: '', filters: `creatureSlug:"${creatureSlug}"`, hitsPerPage: 100, distinct: false }],
    });
    return this.hitsFrom(results[0]).map(toCatalogEntry);
  }

  async getById(objectID: string): Promise<CatalogEntry | null> {
    try {
      const hit = await this.client.getObject<AlgoliaRecord>({ indexName: INDEX_NAME, objectID });
      return toCatalogEntry({ ...hit, objectID });
    } catch {
      return null;
    }
  }

  /** Autocomplete — real ranked/typo-tolerant search, deduped to one hit per creature. */
  async searchCreatures(query: string, limit = 20): Promise<CatalogEntry[]> {
    const { results } = await this.client.search<AlgoliaRecord>({
      requests: [
        {
          indexName: INDEX_NAME,
          query,
          distinct: true,
          hitsPerPage: limit,
          attributesToRetrieve: ['objectID', 'creatureName', 'creatureSlug', 'r2Url', 'transcript', 'creatureImageUrl'],
        },
      ],
    });
    return this.hitsFrom(results[0]).map(toCatalogEntry);
  }

  private hitsFrom(result: unknown): (AlgoliaRecord & { objectID: string })[] {
    return (result as { hits?: (AlgoliaRecord & { objectID: string })[] } | undefined)?.hits ?? [];
  }
}
