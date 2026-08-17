import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { CatalogEntry } from '../services/catalog';

const TAG_HINT = '💡 Tip: click Tag to save this sound for quick access later';

export function buildRandomPayload(sound: CatalogEntry, guildTagCount: number) {
  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('Playing a random sound')
    .addFields([{ name: 'Name', value: sound.creatureName }]);

  if (sound.creatureImageUrl) embed.setImage(sound.creatureImageUrl);

  embed.addFields([{ name: 'Text', value: sound.transcript || `¯\\_(ツ)_/¯` }]);

  if (guildTagCount === 0) embed.setFooter({ text: TAG_HINT });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(JSON.stringify({ button: 'play', command: 'play', subcommand: 'random' }))
      .setLabel('Play')
      .setEmoji('▶️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(JSON.stringify({ button: 'reroll', command: 'play', subcommand: 'random' }))
      .setLabel('Reroll')
      .setEmoji('🔀')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(JSON.stringify({ button: 'creatureR', command: 'play', subcommand: 'sound' }))
      .setLabel('Show Creature')
      .setEmoji('👤')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row] };
}
