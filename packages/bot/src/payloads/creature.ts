import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } from 'discord.js';
import { CatalogEntry } from '../services/catalog';
import { PictureFinder } from '../services/pictureFinder';
import { fileNameFromObjectId } from '../util/soundDisplay';

const ITEMS_PER_PAGE = 15;

export interface Creature {
  name: string;
  slug: string;
  sounds: CatalogEntry[];
}

export function buildCreaturePayload(creature: Creature, curSoundIndex: number, pictures: PictureFinder) {
  const pagesNeeded = creature.sounds.length > ITEMS_PER_PAGE;
  const curPage = Math.floor(curSoundIndex / ITEMS_PER_PAGE);
  const lastPage = Math.floor((creature.sounds.length - 1) / ITEMS_PER_PAGE);
  const sound = creature.sounds[curSoundIndex];

  const embed = new EmbedBuilder().setColor('#0099ff').setTitle(creature.name);

  const imageUrl = pictures.getImageUrl(creature.name);
  if (imageUrl) embed.setImage(imageUrl);

  let fileNames = creature.sounds.map((s) => fileNameFromObjectId(s.objectID));
  fileNames[curSoundIndex] = `**${fileNames[curSoundIndex]}**`;
  const text = sound.transcript || `¯\\_(ツ)_/¯`;

  if (pagesNeeded) {
    const start = curPage * ITEMS_PER_PAGE;
    const end = (curPage + 1) * ITEMS_PER_PAGE;
    fileNames = fileNames.slice(start, end);
    embed.setDescription(`Page ${curPage + 1} of ${lastPage + 1}`);
  }

  embed.addFields({ name: 'Text', value: text }, { name: 'Sounds', value: fileNames.join('\n') || '​' });

  return { embeds: [embed], components: buildComponents(creature, curSoundIndex, curPage, lastPage, pagesNeeded) };
}

function buildComponents(creature: Creature, curSoundIndex: number, curPage: number, lastPage: number, pagesNeeded: boolean) {
  const pageSounds = creature.sounds
    .map((s, i) => ({ s, i }))
    .slice(curPage * ITEMS_PER_PAGE, (curPage + 1) * ITEMS_PER_PAGE);

  const select = new StringSelectMenuBuilder()
    .setCustomId(JSON.stringify({ command: 'play', subcommand: 'creature' }))
    .setPlaceholder('Pick a sound')
    .addOptions(
      pageSounds.map(({ s, i }) => ({
        label: fileNameFromObjectId(s.objectID).slice(0, 100),
        value: i.toString(),
        default: i === curSoundIndex,
      }))
    );
  const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

  const backButton = new ButtonBuilder()
    .setCustomId(JSON.stringify({ button: 'flip', command: 'play', subcommand: 'creature', soundIndex: (curPage - 1) * ITEMS_PER_PAGE }))
    .setLabel('<--')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(curPage === 0);
  const nextButton = new ButtonBuilder()
    .setCustomId(JSON.stringify({ button: 'flip', command: 'play', subcommand: 'creature', soundIndex: (curPage + 1) * ITEMS_PER_PAGE }))
    .setLabel('-->')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(curPage === lastPage);
  const playButton = new ButtonBuilder()
    .setCustomId(JSON.stringify({ button: 'play', command: 'play', subcommand: 'creature', soundIndex: curSoundIndex }))
    .setLabel('Play')
    .setStyle(ButtonStyle.Primary);
  const tagButton = new ButtonBuilder()
    .setCustomId(JSON.stringify({ button: 'tag', command: 'play', subcommand: 'creature', soundIndex: curSoundIndex }))
    .setLabel('Tag')
    .setStyle(ButtonStyle.Secondary);

  const buttonsRow = new ActionRowBuilder<ButtonBuilder>();
  if (pagesNeeded) {
    buttonsRow.addComponents(backButton, playButton, nextButton, tagButton);
  } else {
    buttonsRow.addComponents(playButton, tagButton);
  }

  return [selectRow, buttonsRow];
}
