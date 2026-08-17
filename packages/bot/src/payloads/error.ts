import { EmbedBuilder, MessageFlags } from 'discord.js';

export function buildErrorPayload(errorMessage = 'Something went wrong!', title = `¯\\_(ツ)_/¯`) {
  const embed = new EmbedBuilder().setColor('#ed5121').addFields([{ name: title, value: errorMessage }]);
  return { embeds: [embed], flags: MessageFlags.Ephemeral };
}
