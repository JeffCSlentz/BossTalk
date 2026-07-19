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
      const files = fs.readdirSync(creaturePath);
      for (const file of files) {
        if (!file.endsWith('.ogg')) continue;
        const localPath = path.join(creaturePath, file);
        const stat = fs.statSync(localPath);
        if (stat.size < MIN_FILE_SIZE_BYTES) continue;
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
