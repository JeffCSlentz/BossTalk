import { Location, emptyLocation } from './Location';

export interface Sound {
  fileKey: string;
  creatureName: string;
  location: Location;
  transcript: string;
}

export function soundFromFilePath(filePath: string): Sound {
  const parts = filePath.replace(/\\/g, '/').split('/');
  const creatureName = parts.at(-2) ?? '';
  const fileName = parts.at(-1) ?? '';
  const fileKey = `sounds/creature/${creatureName}/${fileName}`;
  return {
    fileKey,
    creatureName,
    location: emptyLocation(),
    transcript: '',
  };
}

export const BANNED_KEYWORDS = ['wound', 'attack', 'crit', 'battleshout'] as const;
export const MIN_FILE_SIZE_BYTES = 4200;

export function isBannedPath(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return BANNED_KEYWORDS.some((word) => lower.includes(word));
}
