import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

export const UNTAG_SUCCESS_BUTTON = { UNDO_UNTAG: 'UNDO_UNTAG' } as const;

export interface UndoState {
  tag: string;
  r2Url: string;
  author: string;
}

export function buildUntagSuccessPayload(tagName: string, fileName: string) {
  const embed = new EmbedBuilder()
    .setColor('#3ba55c')
    .addFields([{ name: '(☞ﾟヮﾟ)☞ Untag Success!', value: `I untagged **${tagName}** from **${fileName}**` }]);

  const undoButton = new ButtonBuilder()
    .setCustomId(JSON.stringify({ button: UNTAG_SUCCESS_BUTTON.UNDO_UNTAG, command: 'play', subcommand: 'tag' }))
    .setLabel('Undo')
    .setEmoji('↩️')
    .setStyle(ButtonStyle.Secondary);

  return { embeds: [embed], components: [new ActionRowBuilder<ButtonBuilder>().addComponents(undoButton)] };
}
