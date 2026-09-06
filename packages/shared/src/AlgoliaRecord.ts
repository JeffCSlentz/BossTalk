import { InstanceType } from './Location';

// The base fields are what the audio+transcription upload step writes.
// Everything below "Enrichment fields" is added back by the separate
// enrichment pipeline later — Algolia handles schema growth fine, so
// upload and enrichment can each own their own fields via partial updates
// without colliding.
export interface AlgoliaRecord extends Record<string, unknown> {
  objectID: string;
  r2Url: string;
  creatureName: string;
  creatureSlug: string;
  transcript: string;
  durationSeconds: number;
  uploadedAt: number;
  // Random selection has no native Algolia query — the bot filters
  // `_rand >= <threshold>` instead of holding a local copy of the catalog.
  _rand: number;

  // Enrichment fields — not set by the upload pipeline.

  // Creature-level (same value duplicated across every sound of a creature) —
  // derived once per creatureSlug by enrichment/creatureEnrichment.ts.
  expansion?: string;
  zone?: string;
  instanceType?: InstanceType;
  creatureRole?: 'boss' | 'trash' | 'npc' | '';
  raceSpecies?: string;
  expansionAliases?: string[];
  zoneAliases?: string[];
  // Backfilled from the creature-level enrichment's own image lookup, falling
  // back to packages/bot/data/picUrls.json (creatureName -> first image URL)
  // when the lookup doesn't find one.
  creatureImageUrl?: string;
  // Marks that this record's creature-level fields have been resolved.
  // Doubles as the enrichment pipeline's cache: AlgoliaClient.fetchCreatureFacts
  // queries for any record of this creatureSlug with creatureEnriched:true and
  // reuses its facts instead of re-deriving them, so the "cache" lives here —
  // durable, shared, and never lost to a wiped local disk — rather than in a
  // local file.
  creatureEnriched?: boolean;

  // Sound-level — derived per sound by enrichment/soundTagger.ts.
  soundTypes?: string[];
  moodTags?: string[];
  hasDialogue?: boolean;
}

export function objectIDFromFileKey(fileKey: string): string {
  return fileKey.replace(/^sounds\//, '').replace(/\.ogg$/, '');
}
