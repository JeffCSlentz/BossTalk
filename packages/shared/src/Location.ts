export type InstanceType = 'world' | 'dungeon' | 'raid' | 'scenario' | 'pvp' | '';

export interface Location {
  expansion: string;
  zone: string;
  instanceType: InstanceType;
}

export function emptyLocation(): Location {
  return { expansion: '', zone: '', instanceType: '' };
}
