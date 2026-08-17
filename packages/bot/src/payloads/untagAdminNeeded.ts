import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

export const UNTAG_ADMIN_BUTTON = { A_UNTAG: 'A_UNTAG' } as const;

export function buildUntagAdminNeededPayload(tagName: string, fileName: string, requestingUserMention: string) {
  const embed = new EmbedBuilder()
    .setColor('#ed5121')
    .addFields([{ name: 'Admin Needed', value: `${requestingUserMention} tried to untag **${tagName}** from **${fileName}** but isn't the tag author.` }]);

  const button = new ButtonBuilder()
    .setCustomId(JSON.stringify({ button: UNTAG_ADMIN_BUTTON.A_UNTAG, command: 'play', subcommand: 'tag' }))
    .setLabel('Admin: Untag')
    .setEmoji('🚫')
    .setStyle(ButtonStyle.Danger);

  return { embeds: [embed], components: [new ActionRowBuilder<ButtonBuilder>().addComponents(button)] };
}
