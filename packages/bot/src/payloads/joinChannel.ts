import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

export function buildJoinChannelPayload() {
  const embed = new EmbedBuilder()
    .setColor('#ed5121')
    .addFields([{ name: '( ´･･)ﾉ(._.`)', value: "I tried to play a sound but I'm not in a channel!" }]);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(JSON.stringify({ command: 'join' })).setLabel('Join?').setStyle(ButtonStyle.Secondary)
  );
  return { embeds: [embed], components: [row], ephemeral: true };
}
