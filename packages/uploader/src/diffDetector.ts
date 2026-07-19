import type { SoundSource, DiscoveredSound } from './casc/SoundSource';
import type { R2Client } from './r2Client';

export interface DiffResult {
  newSounds: DiscoveredSound[];
  totalDiscovered: number;
  totalInR2: number;
}

export async function detectNew(
  source: SoundSource,
  r2: R2Client,
  creatureFilter?: string
): Promise<DiffResult> {
  const r2Prefix = creatureFilter
    ? `sounds/creature/${creatureFilter.toLowerCase()}/`
    : 'sounds/creature/';

  const [discovered, r2Keys] = await Promise.all([
    source.listSounds(creatureFilter),
    r2.listKeys(r2Prefix),
  ]);

  const r2Set = new Set(r2Keys);
  const newSounds = discovered.filter((s) => !r2Set.has(s.fileKey));

  return {
    newSounds,
    totalDiscovered: discovered.length,
    totalInR2: r2Keys.length,
  };
}
