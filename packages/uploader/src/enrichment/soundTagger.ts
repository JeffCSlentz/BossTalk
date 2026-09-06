import Anthropic from '@anthropic-ai/sdk';
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema';
import { InstanceType } from '@bosstalk/shared';

// Sounds are tagged in batches (one Messages API call covers up to this many
// clips from the same creature) rather than one call per sound. The fixed
// cost of the instructions + vocabulary schema below dwarfs the cost of
// tagging any single clip, so batching amortizes it across many clips instead
// of paying it per sound — the single biggest lever on this pipeline's cost.
export const SOUND_BATCH_SIZE = 25;

// Deliberately excludes anything that requires encounter/game-state
// knowledge the model doesn't have from a bare transcript (which spell is
// being cast, current HP, fight phase, whether this is specifically the
// pull-line vs. a mid-fight threat) — every tag here is something the words
// themselves signal, regardless of when in a fight the clip plays.
const SOUND_TYPES = [
  'death',
  'victory',
  'greeting',
  'farewell',
  'idle',
  'exclamation',
  'threat',
  'taunt',
  'boast',
  'command',
  'plea',
  'lament',
  'monologue',
] as const;

// Clarifies the tags whose meaning isn't obvious from the word alone —
// shown to the model inline in the prompt instead of a bare list.
const SOUND_TYPE_HINTS: Partial<Record<(typeof SOUND_TYPES)[number], string>> = {
  threat: 'a menacing warning, regardless of when in the fight it plays',
  command: 'ordering an ally/minion around, not addressing the player',
  lament: 'sorrowful, regretful, mourning',
  monologue: 'an extended narrative or backstory dump',
};

function soundTypeList(): string {
  return SOUND_TYPES.map((t) => (SOUND_TYPE_HINTS[t] ? `${t} (${SOUND_TYPE_HINTS[t]})` : t)).join(', ');
}

const MOOD_TAGS = [
  'funny',
  'dark',
  'menacing',
  'iconic',
  'sad',
  'epic',
  'goofy',
  'creepy',
  'wholesome',
  'chaotic',
  'threatening',
  'mysterious',
] as const;

// Anthropic's structured-output "strict" schema only hard-enforces type/
// properties/required/items — an `enum` inside a property gets downgraded to
// a natural-language hint in the description rather than an actual
// constraint, so the model can (and does) still emit values outside it.
// Bounded vocabularies only stay bounded (and facets only stay clean) if we
// filter here rather than trust the schema alone.
const SOUND_TYPE_SET = new Set<string>(SOUND_TYPES);
const MOOD_TAG_SET = new Set<string>(MOOD_TAGS);

const BATCH_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer' },
          soundTypes: { type: 'array', items: { type: 'string', enum: SOUND_TYPES } },
          moodTags: { type: 'array', items: { type: 'string', enum: MOOD_TAGS } },
          hasDialogue: { type: 'boolean' },
        },
        required: ['index', 'soundTypes', 'moodTags', 'hasDialogue'],
        additionalProperties: false,
      },
    },
  },
  required: ['results'],
  additionalProperties: false,
} as const;

const BATCH_OUTPUT_FORMAT = jsonSchemaOutputFormat(BATCH_OUTPUT_SCHEMA);

export interface SoundBatchItem {
  objectID: string;
  transcript: string;
}

export interface SoundTagResult {
  soundTypes: string[];
  moodTags: string[];
  hasDialogue: boolean;
}

export interface CreatureContext {
  creatureName: string;
  expansion: string;
  zone: string;
  instanceType: InstanceType;
  creatureRole: string;
}

function buildBatchPrompt(context: CreatureContext, sounds: SoundBatchItem[]): string {
  const list = sounds
    .map((s, i) => `${i}. "${s.transcript || '(no speech detected)'}"`)
    .join('\n');

  return `You are tagging a batch of World of Warcraft creature sound clips for a fan search tool. All clips below are from the same creature.

Creature: ${context.creatureName} (${context.creatureRole || 'unknown role'})
Expansion: ${context.expansion || 'unknown'}
Zone: ${context.zone || 'unknown'}
Instance type: ${context.instanceType || 'unknown'}

Transcripts, one per clip, indexed:
${list}

For each indexed clip return:
- index: the clip's index number from the list above
- soundTypes: 1-3 tags from this exact list, choosing whichever apply to this specific clip: ${soundTypeList()}
- moodTags: 0-3 lowercase vibe tags from this exact list: ${MOOD_TAGS.join(', ')}
- hasDialogue: true if the transcript contains actual voiced words, false if it's a wordless roar/grunt/sound-effect (i.e. the transcript is empty or not real dialogue)

Return exactly one result per clip, covering every index exactly once. Every clip must get at least one soundTypes tag.`;
}

// Builds the raw request params for one batch entry — used with the Message
// Batches API (packages/uploader/src/enrichment/enrichmentRunner.ts), which
// is ~50% cheaper than a live call and well-suited here since this pipeline
// isn't latency-sensitive.
export function buildSoundBatchParams(
  context: CreatureContext,
  sounds: SoundBatchItem[]
): Anthropic.MessageCreateParamsNonStreaming {
  return {
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{ role: 'user', content: buildBatchPrompt(context, sounds) }],
    output_config: { format: BATCH_OUTPUT_FORMAT },
  };
}

// Parses a completed batch result message back into a per-objectID map.
// `objectIDs` must be in the same order the sounds were given to
// buildSoundBatchParams for the matching request.
export function parseSoundBatchResult(
  message: Anthropic.Message,
  objectIDs: string[]
): Map<string, SoundTagResult> {
  const text = message.content[0]?.type === 'text' ? message.content[0].text : '{}';
  const parsed = JSON.parse(text) as {
    results: Array<{ index: number; soundTypes: string[]; moodTags: string[]; hasDialogue: boolean }>;
  };

  const out = new Map<string, SoundTagResult>();
  for (const r of parsed.results) {
    const objectID = objectIDs[r.index];
    if (!objectID) continue;
    out.set(objectID, {
      soundTypes: r.soundTypes.filter((t) => SOUND_TYPE_SET.has(t)),
      moodTags: r.moodTags.filter((t) => MOOD_TAG_SET.has(t)),
      hasDialogue: r.hasDialogue,
    });
  }
  return out;
}
