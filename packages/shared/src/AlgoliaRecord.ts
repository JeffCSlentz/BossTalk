export interface AlgoliaRecord extends Record<string, unknown> {
  objectID: string;
  fileKey: string;
  r2Url: string;
  creatureName: string;
  creatureSlug: string;
  creatureImageUrl: string;
  transcript: string;
  expansion: string;
  expansionAliases: string[];
  zone: string;
  zoneAliases: string[];
  instanceType: string;
  tags: string[];
  durationSeconds: number;
  enrichedAt: number;
  uploadedAt: number;
}

export function objectIDFromFileKey(fileKey: string): string {
  return fileKey.replace(/^sounds\//, '').replace(/\.ogg$/, '');
}
