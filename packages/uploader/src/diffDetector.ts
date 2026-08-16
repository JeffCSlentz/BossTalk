import { objectIDFromFileKey } from '@bosstalk/shared';
import type { SoundSource, DiscoveredSound } from './casc/SoundSource';
import type { R2Client } from './r2Client';
import type { AlgoliaClient } from './algoliaClient';

export interface DiffResult {
  newSounds: DiscoveredSound[];
  totalDiscovered: number;
  totalInR2: number;
  totalInAlgolia: number;
}

export async function detectNew(
  source: SoundSource,
  r2: R2Client,
  algolia: AlgoliaClient,
  creatureFilter?: string
): Promise<DiffResult> {
  const r2Prefix = creatureFilter
    ? `sounds/creature/${creatureFilter.toLowerCase()}/`
    : 'sounds/creature/';

  const [discovered, r2Keys, algoliaIds] = await Promise.all([
    source.listSounds(creatureFilter),
    r2.listKeys(r2Prefix),
    algolia.fetchAllObjectIDs(),
  ]);

  const r2Set = new Set(r2Keys);
  // Only skip a sound if it's fully done — present in R2 *and* indexed to
  // Algolia. A file that's in R2 but missing from Algolia (e.g. a prior run
  // got interrupted between the two writes) is treated as not-done and
  // retried, rather than being silently stuck forever.
  const newSounds = discovered.filter((s) => {
    const inR2 = r2Set.has(s.fileKey);
    const inAlgolia = algoliaIds.has(objectIDFromFileKey(s.fileKey));
    return !(inR2 && inAlgolia);
  });

  return {
    newSounds,
    totalDiscovered: discovered.length,
    totalInR2: r2Keys.length,
    totalInAlgolia: algoliaIds.size,
  };
}
