const WOWHEAD_SEARCH = 'https://www.wowhead.com/search?q=';

export interface CreatureImageResult {
  imageUrl: string;
  source: 'wowhead' | 'none';
}

export async function fetchCreatureImage(creatureSlug: string): Promise<CreatureImageResult> {
  const displayName = slugToDisplayName(creatureSlug);

  try {
    const searchUrl = `${WOWHEAD_SEARCH}${encodeURIComponent(displayName)}&opensearch`;
    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': 'BossTalk-Uploader/1.0' },
    });

    if (!res.ok) throw new Error(`WoWHead returned ${res.status}`);

    const data = (await res.json()) as [string, string[], string[], string[]];
    const names = data[1] ?? [];
    const urls = data[3] ?? [];

    const idx = names.findIndex((n) => n.toLowerCase().includes(displayName.toLowerCase()));
    if (idx >= 0 && urls[idx]) {
      const npcId = urls[idx].match(/npc=(\d+)/)?.[1];
      if (npcId) {
        return {
          imageUrl: `https://wow.zamimg.com/images/wow/npcs/zoom/creature-display-${npcId}.jpg`,
          source: 'wowhead',
        };
      }
    }
  } catch {
    // Fall through to no-image result
  }

  return { imageUrl: '', source: 'none' };
}

function slugToDisplayName(slug: string): string {
  return slug
    .replace(/\d+xp_/g, '')
    .replace(/_/g, ' ')
    .replace(/\d+$/, '')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
