import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } from 'discord.js';
import { CatalogEntry } from '../services/catalog';
import { fileNameFromObjectId, transcriptSnippet } from '../util/soundDisplay';

const ITEMS_PER_PAGE = 15;
const LIST_LINE_MAX = 70;
const TAG_HINT = '💡 Tip: click Tag to save this sound for quick access later';

export interface Creature {
  name: string;
  slug: string;
  sounds: CatalogEntry[];
}

// Filename alone isn't very informative (and file names occasionally do carry
// a hint), but the transcript — when a sound has one, most combat barks don't
// — is the more useful signal, so show both: name first, then a short quote.
function soundLine(sound: CatalogEntry): string {
  const name = fileNameFromObjectId(sound.objectID);
  const snippet = transcriptSnippet(sound.transcript, 6);
  const line = snippet ? `${name} — "${snippet}"` : name;
  return line.length > LIST_LINE_MAX ? `${line.slice(0, LIST_LINE_MAX - 1)}…` : line;
}

export function buildSoundPayload(creature: Creature, curSoundIndex: number, guildTagCount: number) {
  const pagesNeeded = creature.sounds.length > ITEMS_PER_PAGE;
  const curPage = Math.floor(curSoundIndex / ITEMS_PER_PAGE);
  const lastPage = Math.floor((creature.sounds.length - 1) / ITEMS_PER_PAGE);
  const sound = creature.sounds[curSoundIndex];

  const embed = new EmbedBuilder().setColor('#0099ff').setTitle(creature.name);

  // Discord embeds only offer two image slots: a small top-right thumbnail
  // (narrows the column next to it, causing the "Sounds" list to wrap early)
  // or a full-width image pinned to the bottom, below all fields. Using the
  // full-width one to avoid squeezing/truncating text content.
  if (sound.creatureImageUrl) embed.setImage(sound.creatureImageUrl);

  embed.setDescription(sound.transcript ? `"${sound.transcript}"` : `¯\\_(ツ)_/¯`);

  let soundLines = creature.sounds.map(soundLine);
  soundLines[curSoundIndex] = `**${soundLines[curSoundIndex]}**`;

  if (pagesNeeded) {
    const start = curPage * ITEMS_PER_PAGE;
    const end = (curPage + 1) * ITEMS_PER_PAGE;
    soundLines = soundLines.slice(start, end);
  }

  embed.addFields({ name: 'Sounds', value: soundLines.join('\n') || '​' });

  const footerParts: string[] = [];
  if (pagesNeeded) footerParts.push(`Page ${curPage + 1} of ${lastPage + 1}`);
  if (guildTagCount === 0) footerParts.push(TAG_HINT);
  if (footerParts.length > 0) embed.setFooter({ text: footerParts.join(' • ') });

  return { embeds: [embed], components: buildComponents(creature, curSoundIndex, curPage, lastPage, pagesNeeded) };
}

function buildComponents(creature: Creature, curSoundIndex: number, curPage: number, lastPage: number, pagesNeeded: boolean) {
  const pageSounds = creature.sounds
    .map((s, i) => ({ s, i }))
    .slice(curPage * ITEMS_PER_PAGE, (curPage + 1) * ITEMS_PER_PAGE);

  const select = new StringSelectMenuBuilder()
    .setCustomId(JSON.stringify({ command: 'play', subcommand: 'sound' }))
    .setPlaceholder('Pick a sound')
    .addOptions(
      pageSounds.map(({ s, i }) => {
        const snippet = transcriptSnippet(s.transcript, 10);
        return {
          label: fileNameFromObjectId(s.objectID).slice(0, 100),
          ...(snippet ? { description: snippet.slice(0, 100) } : {}),
          value: i.toString(),
          default: i === curSoundIndex,
        };
      })
    );
  const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

  const backButton = new ButtonBuilder()
    .setCustomId(JSON.stringify({ button: 'flip', command: 'play', subcommand: 'sound', soundIndex: (curPage - 1) * ITEMS_PER_PAGE }))
    .setLabel('Back')
    .setEmoji('⬅️')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(curPage === 0);
  const nextButton = new ButtonBuilder()
    .setCustomId(JSON.stringify({ button: 'flip', command: 'play', subcommand: 'sound', soundIndex: (curPage + 1) * ITEMS_PER_PAGE }))
    .setLabel('Next')
    .setEmoji('➡️')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(curPage === lastPage);
  const playButton = new ButtonBuilder()
    .setCustomId(JSON.stringify({ button: 'play', command: 'play', subcommand: 'sound', soundIndex: curSoundIndex }))
    .setLabel('Play')
    .setEmoji('▶️')
    .setStyle(ButtonStyle.Primary);
  const tagButton = new ButtonBuilder()
    .setCustomId(JSON.stringify({ button: 'tag', command: 'play', subcommand: 'sound', soundIndex: curSoundIndex }))
    .setLabel('Tag')
    .setEmoji('🏷️')
    .setStyle(ButtonStyle.Secondary);

  const buttonsRow = new ActionRowBuilder<ButtonBuilder>();
  if (pagesNeeded) {
    buttonsRow.addComponents(backButton, playButton, nextButton, tagButton);
  } else {
    buttonsRow.addComponents(playButton, tagButton);
  }

  return [selectRow, buttonsRow];
}
