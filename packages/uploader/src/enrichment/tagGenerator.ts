import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export interface EnrichmentResult {
  tags: string[];
  expansionAliases: string[];
  zoneAliases: string[];
}

export async function generateTags(opts: {
  creatureName: string;
  transcript: string;
  expansion: string;
  zone: string;
}): Promise<EnrichmentResult> {
  const prompt = `You are enriching a database of World of Warcraft creature sounds for a Discord bot.

Creature: ${opts.creatureName}
Expansion: ${opts.expansion}
Zone: ${opts.zone}
Transcript: ${opts.transcript || '(no speech detected)'}

Return a JSON object with:
- "tags": array of 2-5 lowercase vibe/mood tags. Choose from: funny, dark, menacing, iconic, sad, epic, goofy, creepy, wholesome, chaotic, threatening, mysterious
- "expansionAliases": common player names/abbreviations for this expansion (e.g. "Vanilla", "TBC", "WotLK", "Cata", "MoP", "WoD", "Legion", "BfA", "SL", "DF", "TWW")
- "zoneAliases": common player names/abbreviations for this zone (e.g. "ICC" for "Icecrown Citadel")

Respond only with the JSON object, no markdown.`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '{}';
  return JSON.parse(text) as EnrichmentResult;
}
