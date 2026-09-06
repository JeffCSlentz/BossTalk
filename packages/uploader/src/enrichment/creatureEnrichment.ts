import Anthropic from '@anthropic-ai/sdk';
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { InstanceType } from '@bosstalk/shared';
import logger from '../logger';

// Cheap default — a WebSearch-capable Agent SDK call costs meaningfully more
// than a plain Messages API call (tool-use overhead + the $10/1,000-search
// fee), so keep both tiers on Haiku unless accuracy demands more.
const MODEL = process.env.ANTHROPIC_ENRICHMENT_MODEL ?? 'claude-haiku-4-5-20251001';

const INSTANCE_TYPES = new Set<string>(['world', 'dungeon', 'raid', 'scenario', 'pvp']);
const CREATURE_ROLES = new Set<string>(['boss', 'trash', 'npc']);

const anthropicClient = new Anthropic();

export interface CreatureEnrichment {
  expansion: string;
  zone: string;
  instanceType: InstanceType;
  creatureRole: 'boss' | 'trash' | 'npc' | '';
  raceSpecies: string;
  expansionAliases: string[];
  zoneAliases: string[];
  // Direct link to a representative creature image found during the lookup.
  // Empty string when the agent couldn't find one it was confident in —
  // the caller falls back to packages/bot/data/picUrls.json in that case.
  imageUrl: string;
}

function clampFacts(result: {
  expansion: string;
  zone: string;
  instanceType: string;
  creatureRole: string;
  raceSpecies: string;
  expansionAliases: string[];
  zoneAliases: string[];
  imageUrl: string;
}): CreatureEnrichment {
  // Same enum-softening caveat as soundTagger.ts — the schema's enum
  // constraints on instanceType/creatureRole are hints, not guarantees.
  return {
    ...result,
    instanceType: (INSTANCE_TYPES.has(result.instanceType) ? result.instanceType : '') as InstanceType,
    creatureRole: (CREATURE_ROLES.has(result.creatureRole) ? result.creatureRole : '') as CreatureEnrichment['creatureRole'],
  };
}

// ---------------------------------------------------------------------------
// Tier 1: a plain (no-tools) guess from the model's own training knowledge.
// Most named WoW bosses/NPCs are things Haiku already knows confidently —
// paying for a WebSearch-capable agent call on every creature wastes the
// $10/1,000-search fee (and the extra tool-use tokens) on creatures that
// didn't need a lookup at all. This tier is cheap enough that even creatures
// which go on to escalate to Tier 2 barely add to the total cost.
// ---------------------------------------------------------------------------

const GUESS_SCHEMA = {
  type: 'object',
  properties: {
    expansion: { type: 'string' },
    zone: { type: 'string' },
    instanceType: { type: 'string', enum: ['world', 'dungeon', 'raid', 'scenario', 'pvp', ''] },
    creatureRole: { type: 'string', enum: ['boss', 'trash', 'npc'] },
    raceSpecies: { type: 'string' },
    expansionAliases: { type: 'array', items: { type: 'string' } },
    zoneAliases: { type: 'array', items: { type: 'string' } },
    confidence: { type: 'string', enum: ['high', 'low'] },
  },
  required: [
    'expansion',
    'zone',
    'instanceType',
    'creatureRole',
    'raceSpecies',
    'expansionAliases',
    'zoneAliases',
    'confidence',
  ],
  additionalProperties: false,
} as const;

const GUESS_OUTPUT_FORMAT = jsonSchemaOutputFormat(GUESS_SCHEMA);

function buildGuessPrompt(creatureName: string, sampleTranscripts: string[]): string {
  const transcriptBlock = sampleTranscripts.length
    ? sampleTranscripts.map((t) => `- "${t}"`).join('\n')
    : '(no dialogue transcribed)';

  return `You are enriching a database of World of Warcraft creature sound clips for a fan search tool.

Creature name: ${creatureName}
Sample voice line transcripts from this creature:
${transcriptBlock}

Answer from your own knowledge only — you have no web access for this step:
- expansion: the WoW expansion this creature is from, e.g. "Wrath of the Lich King"
- zone: the zone or instance this creature is found in, e.g. "Icecrown Citadel"
- instanceType: one of world, dungeon, raid, scenario, pvp
- creatureRole: one of boss, trash, npc
- raceSpecies: a short freeform race/species label, e.g. "undead", "dragon", "elemental"
- expansionAliases: common player abbreviations for the expansion, e.g. "WotLK"
- zoneAliases: common player abbreviations for the zone, e.g. "ICC"
- confidence: "high" only if you're genuinely confident you know this specific creature and are not guessing at any field above; "low" otherwise (including if the name is unfamiliar, generic, or could refer to multiple different creatures)

Be especially wary of false confidence on recent content: WoW ships new expansions and patches after your training data ends, and a creature from one of those can still *feel* naggingly familiar — its name or theme may pattern-match to something you actually know from an older expansion, tempting you to answer as if you recognize it when you don't. The sample transcripts are your strongest signal for this: if their tone, slang, or subject matter doesn't cleanly fit the expansion you're about to name, that mismatch itself is a reason to answer "low" rather than force-fitting the creature into an expansion you do know. When genuinely unsure whether a creature could be from content newer than what you have solid knowledge of, prefer "low" over guessing.

If you can't determine a field confidently, use an empty string for it (or an empty array for the alias fields) rather than guessing — this does not affect your confidence rating for fields you are sure of.`;
}

async function guessCreatureFacts(
  creatureName: string,
  sampleTranscripts: string[]
): Promise<{ confidence: 'high' | 'low'; result: CreatureEnrichment } | null> {
  const message = await anthropicClient.messages.parse({
    model: MODEL,
    max_tokens: 512,
    messages: [{ role: 'user', content: buildGuessPrompt(creatureName, sampleTranscripts) }],
    output_config: { format: GUESS_OUTPUT_FORMAT },
  });

  if (!message.parsed_output) return null;
  const { confidence, ...facts } = message.parsed_output;
  return {
    confidence,
    // No browsing capability at this tier, so there's no image to report —
    // the caller falls back to picUrls.json for creatures resolved here.
    result: clampFacts({ ...facts, imageUrl: '' }),
  };
}

// ---------------------------------------------------------------------------
// Tier 2: Agent SDK with WebSearch/WebFetch — only reached when Tier 1 isn't
// confident. Live lookup for creatures the model doesn't already know cold.
// ---------------------------------------------------------------------------

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    expansion: { type: 'string' },
    zone: { type: 'string' },
    instanceType: { type: 'string', enum: ['world', 'dungeon', 'raid', 'scenario', 'pvp', ''] },
    creatureRole: { type: 'string', enum: ['boss', 'trash', 'npc'] },
    raceSpecies: { type: 'string' },
    expansionAliases: { type: 'array', items: { type: 'string' } },
    zoneAliases: { type: 'array', items: { type: 'string' } },
    imageUrl: { type: 'string' },
  },
  required: [
    'expansion',
    'zone',
    'instanceType',
    'creatureRole',
    'raceSpecies',
    'expansionAliases',
    'zoneAliases',
    'imageUrl',
  ],
  additionalProperties: false,
} as const;

function buildLookupPrompt(creatureName: string, sampleTranscripts: string[]): string {
  const transcriptBlock = sampleTranscripts.length
    ? sampleTranscripts.map((t) => `- "${t}"`).join('\n')
    : '(no dialogue transcribed)';

  return `You are enriching a database of World of Warcraft creature sound clips for a fan search tool.

Creature name: ${creatureName}
Sample voice line transcripts from this creature:
${transcriptBlock}

Look this creature up (e.g. on Wowhead or the Warcraft wiki) to answer confidently rather than guessing:
- expansion: the WoW expansion this creature is from, e.g. "Wrath of the Lich King"
- zone: the zone or instance this creature is found in, e.g. "Icecrown Citadel"
- instanceType: one of world, dungeon, raid, scenario, pvp
- creatureRole: one of boss, trash, npc
- raceSpecies: a short freeform race/species label, e.g. "undead", "dragon", "elemental"
- expansionAliases: common player abbreviations for the expansion, e.g. "WotLK"
- zoneAliases: common player abbreviations for the zone, e.g. "ICC"
- imageUrl: a direct URL to a representative image of this creature, but only if you happen to find one on a page you already visited for the facts above — do not spend a separate search purely hunting for an image. Leave this empty if you don't have one in hand; a fallback image source is used when this is empty.

If you can't determine a field confidently, use an empty string for it (or an empty array for the alias fields) rather than guessing.`;
}

async function runQuery(prompt: string): Promise<CreatureEnrichment> {
  for await (const message of query({
    prompt,
    options: {
      model: MODEL,
      allowedTools: ['WebSearch', 'WebFetch'],
      permissionMode: 'dontAsk',
      outputFormat: { type: 'json_schema', schema: OUTPUT_SCHEMA },
    },
  })) {
    if (message.type === 'result') {
      if (message.subtype !== 'success') {
        throw new Error(`Agent query failed: ${message.errors.join('; ')}`);
      }
      if (!message.structured_output) {
        throw new Error('Agent query returned no structured_output');
      }
      return clampFacts(message.structured_output as CreatureEnrichment);
    }
  }
  throw new Error('Agent query ended without a result message');
}

// Derives creature-level facts via the model (Tier 1, escalating to Tier 2 on
// low confidence). Always does the lookup — the caller is responsible for
// checking whether this creature is already enriched (via
// AlgoliaClient.fetchCreatureFacts, which reads the facts already stamped on
// its sound records) before calling this, so an already-resolved creature is
// never looked up twice.
export async function enrichCreature(opts: {
  creatureSlug: string;
  creatureName: string;
  sampleTranscripts: string[];
}): Promise<CreatureEnrichment> {
  logger.info(`Enriching creature: ${opts.creatureName} (${opts.creatureSlug})`);

  const guess = await guessCreatureFacts(opts.creatureName, opts.sampleTranscripts);
  if (guess && guess.confidence === 'high') {
    return guess.result;
  }

  logger.info(`Low-confidence guess for ${opts.creatureName} — escalating to web lookup`);
  return runQuery(buildLookupPrompt(opts.creatureName, opts.sampleTranscripts));
}
