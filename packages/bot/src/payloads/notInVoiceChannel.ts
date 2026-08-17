import { EmbedBuilder, MessageFlags } from 'discord.js';

export function buildNotInVoiceChannelPayload() {
  const embed = new EmbedBuilder()
    .setColor('#ed5121')
    .addFields([{ name: '( ´･･)ﾉ(._.`)', value: "You're not in a voice channel you silly goose" }]);
  return { embeds: [embed], flags: MessageFlags.Ephemeral };
}
