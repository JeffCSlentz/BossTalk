const CATEGORY_KEYWORDS: Record<string, string[]> = {
  aggro: ['aggro', 'alert', 'detect', 'notice'],
  death: ['death', 'die', 'killed'],
  combat: ['combat', 'fight', 'atk'],
  idle: ['idle', 'ambient', 'loop'],
  greeting: ['hello', 'hi', 'greet', 'intro'],
  special: ['special', 'ability', 'spell', 'cast'],
  event: ['event', 'script', 'trigger'],
};

export function categorizeFromPath(filePath: string): string {
  const lower = filePath.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return category;
    }
  }
  return 'unknown';
}
