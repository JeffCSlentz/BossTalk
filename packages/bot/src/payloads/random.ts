import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { CatalogEntry } from '../services/catalog';
import { PictureFinder } from '../services/pictureFinder';
import { fileNameFromObjectId } from '../util/soundDisplay';

export function buildRandomPayload(sound: CatalogEntry, pictures: PictureFinder) {
  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('Playing a random sound')
    .addFields([{ name: 'Name', value: sound.creatureName }]);

  const imageUrl = pictures.getImageUrl(sound.creatureName);
  if (imageUrl) embed.setImage(imageUrl);

  embed.addFields([
    { name: 'Sound', value: fileNameFromObjectId(sound.objectID), inline: true },
    { name: 'Text', value: sound.transcript || `¯\\_(ツ)_/¯` },
  ]);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(JSON.stringify({ button: 'play', command: 'play', subcommand: 'random' }))
      .setLabel('Play')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(JSON.stringify({ button: 'reroll', command: 'play', subcommand: 'random' }))
      .setLabel('Reroll')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(JSON.stringify({ button: 'creatureR', command: 'play', subcommand: 'creature' }))
      .setLabel('Show Creature')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row] };
}
