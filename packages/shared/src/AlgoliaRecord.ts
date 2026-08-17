// Deliberately minimal — this is what the audio+transcription upload step
// writes. Enrichment fields (tags, aliases, expansion/zone, creature image,
// etc.) get added back by the separate enrichment pipeline later; Algolia
// handles schema growth fine, so there's no need to pre-declare them here.
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
  // Enrichment field — not set by the upload pipeline. Backfilled from
  // packages/bot/data/picUrls.json (creatureName -> first image URL).
  creatureImageUrl?: string;
}

export function objectIDFromFileKey(fileKey: string): string {
  return fileKey.replace(/^sounds\//, '').replace(/\.ogg$/, '');
}
