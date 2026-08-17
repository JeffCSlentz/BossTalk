import { Sound } from './Sound';

export interface Creature {
  slug: string;
  displayName: string;
  imageUrl: string;
  sounds: Sound[];
}
