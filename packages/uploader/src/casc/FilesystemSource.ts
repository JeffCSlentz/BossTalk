import fs from 'fs';
import path from 'path';
import { isBannedPath, MIN_FILE_SIZE_BYTES } from '@bosstalk/shared';
import logger from '../logger';
import type { DiscoveredSound, SoundSource } from './SoundSource';

export class FilesystemSource implements SoundSource {
  readonly name = 'filesystem';
  private soundsRoot: string;

  constructor(soundsRoot: string) {
    this.soundsRoot = soundsRoot;
  }

  async listSounds(creatureFilter?: string): Promise<DiscoveredSound[]> {
    const creatureDir = path.join(this.soundsRoot, 'creature');
    let creatures = fs.readdirSync(creatureDir).filter(
      (f) => !f.endsWith('.ogg') && !f.startsWith('.')
    );

    if (creatureFilter) {
      creatures = creatures.filter((c) => c.toLowerCase() === creatureFilter.toLowerCase());
      if (creatures.length === 0) {
        throw new Error(`No creature directory found matching '${creatureFilter}' in ${creatureDir}`);
      }
    }

    logger.info(`[filesystem] Scanning ${creatures.length} creature director${creatures.length === 1 ? 'y' : 'ies'}`);

    const discovered: DiscoveredSound[] = [];
    for (const creature of creatures) {
      const creaturePath = path.join(creatureDir, creature);
      for (const { relParts, localPath } of walkOggFiles(creaturePath)) {
        const stat = fs.statSync(localPath);
        if (stat.size < MIN_FILE_SIZE_BYTES) continue;
        // Flatten any subfolder nesting under the creature (see listfileCache.ts).
        const file = relParts.join('_');
        const fileKey = `sounds/creature/${creature}/${file}`;
        if (isBannedPath(fileKey)) continue;
        discovered.push({ fileKey, localPath });
      }
    }
    return discovered;
  }

  async extractToFile(sound: DiscoveredSound, destPath: string): Promise<void> {
    if (!sound.localPath) throw new Error(`No localPath for ${sound.fileKey}`);
    fs.copyFileSync(sound.localPath, destPath);
  }
}

interface WalkedOggFile {
  relParts: string[];
  localPath: string;
}

function walkOggFiles(dir: string, relParts: string[] = []): WalkedOggFile[] {
  const results: WalkedOggFile[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkOggFiles(fullPath, [...relParts, entry.name]));
    } else if (entry.name.endsWith('.ogg')) {
      results.push({ relParts: [...relParts, entry.name], localPath: fullPath });
    }
  }
  return results;
}
