export function fileNameFromR2Url(r2Url: string): string {
  const name = decodeURIComponent(r2Url.split('/').pop() ?? r2Url);
  return name.replace(/\.ogg$/, '');
}

// objectID is the R2 key minus the `sounds/` prefix and `.ogg` suffix
// (see @bosstalk/shared's objectIDFromFileKey), e.g. "creature/aargoss/vo_71_aargoss_01_m".
export function fileNameFromObjectId(objectID: string): string {
  return objectID.split('/').pop() ?? objectID;
}

// First few words of a transcript, for a compact preview alongside a
// filename — most WoW combat barks have no transcript at all (non-verbal),
// so this returns '' rather than a placeholder; callers decide what to show instead.
export function transcriptSnippet(transcript: string, maxWords = 6): string {
  const trimmed = transcript?.trim();
  if (!trimmed) return '';
  const words = trimmed.split(/\s+/);
  if (words.length <= maxWords) return trimmed;
  return `${words.slice(0, maxWords).join(' ')}…`;
}

// r2Url paths are `${R2_PUBLIC_URL}/sounds/creature/<slug>/<file>.ogg` — Tag
// only stores r2Url, so when a "Show Creature" button needs a creatureSlug/
// objectID to jump into the creature view, derive them from the URL rather
// than adding fields to Tag that would only exist for this one case.
export function creatureSlugFromR2Url(r2Url: string): string {
  const parts = r2Url.split('/');
  return decodeURIComponent(parts[parts.length - 2] ?? '');
}

export function objectIdFromR2Url(r2Url: string): string {
  const marker = '/sounds/';
  const idx = r2Url.indexOf(marker);
  if (idx === -1) return '';
  return decodeURIComponent(r2Url.slice(idx + marker.length).replace(/\.ogg$/, ''));
}
