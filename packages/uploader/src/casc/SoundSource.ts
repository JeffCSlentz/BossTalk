export interface DiscoveredSound {
  fileKey: string;
  localPath?: string;
}

export interface SoundSource {
  name: string;
  listSounds(creatureFilter?: string): Promise<DiscoveredSound[]>;
  extractToFile(sound: DiscoveredSound, destPath: string): Promise<void>;
}
