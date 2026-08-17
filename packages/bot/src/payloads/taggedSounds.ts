import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } from 'discord.js';
import { Tag } from '../types/Tag';
import { fileNameFromR2Url } from '../util/soundDisplay';

const ITEMS_PER_PAGE = 15;

export const TAG_BUTTON = {
  FLIP: 'FLIP',
  PLAY: 'PLAY',
  CREATURE_T: 'CREATURE_T',
  TRY_UNTAG: 'TRY_UNTAG',
} as const;

export function buildTaggedSoundsPayload(tags: Tag[], curTagIndex: number) {
  if (tags.length === 0) {
    return {
      embeds: [
        new EmbedBuilder()
          .setColor('#0099ff')
          .setTitle('＞﹏＜ No tags left!')
          .addFields([{ name: 'ᓚᘏᗢ', value: "Here's a cat instead" }]),
      ],
      components: [],
    };
  }

  const pagesNeeded = tags.length > ITEMS_PER_PAGE;
  const curPage = Math.floor(curTagIndex / ITEMS_PER_PAGE);
  const lastPage = Math.floor((tags.length - 1) / ITEMS_PER_PAGE);

  const embed = new EmbedBuilder().setColor('#0099ff').setTitle('Tags').setThumbnail('https://i.imgur.com/AfFp7pu.png');

  let tagNames = tags.map((t) => t.tag);
  tagNames[curTagIndex] = `**${tagNames[curTagIndex]}**`;

  if (pagesNeeded) {
    const start = curPage * ITEMS_PER_PAGE;
    const end = (curPage + 1) * ITEMS_PER_PAGE;
    tagNames = tagNames.slice(start, end);
    embed.setFooter({ text: `Page ${curPage + 1} of ${lastPage + 1}` });
  }

  embed.addFields({ name: 'Tags', value: tagNames.join('\n') });

  const pageTags = tags.map((t, i) => ({ t, i })).slice(curPage * ITEMS_PER_PAGE, (curPage + 1) * ITEMS_PER_PAGE);
  const select = new StringSelectMenuBuilder()
    .setCustomId(JSON.stringify({ command: 'play', subcommand: 'tag' }))
    .setPlaceholder('Pick a tag')
    .addOptions(
      pageTags.map(({ t, i }) => ({
        label: t.tag.slice(0, 100),
        description: fileNameFromR2Url(t.r2Url).slice(0, 100),
        value: i.toString(),
        default: i === curTagIndex,
      }))
    );
  const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

  const backButton = new ButtonBuilder()
    .setCustomId(JSON.stringify({ button: TAG_BUTTON.FLIP, command: 'play', subcommand: 'tag', tagIndex: (curPage - 1) * ITEMS_PER_PAGE }))
    .setLabel('Back')
    .setEmoji('⬅️')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(curPage === 0);
  const nextButton = new ButtonBuilder()
    .setCustomId(JSON.stringify({ button: TAG_BUTTON.FLIP, command: 'play', subcommand: 'tag', tagIndex: (curPage + 1) * ITEMS_PER_PAGE }))
    .setLabel('Next')
    .setEmoji('➡️')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(curPage === lastPage);
  const playButton = new ButtonBuilder()
    .setCustomId(JSON.stringify({ button: TAG_BUTTON.PLAY, command: 'play', subcommand: 'tag', tagIndex: curTagIndex }))
    .setLabel('Play')
    .setEmoji('▶️')
    .setStyle(ButtonStyle.Primary);
  const creatureButton = new ButtonBuilder()
    .setCustomId(JSON.stringify({ button: TAG_BUTTON.CREATURE_T, command: 'play', subcommand: 'sound', tagIndex: curTagIndex }))
    .setLabel('Show Creature')
    .setEmoji('👤')
    .setStyle(ButtonStyle.Secondary);
  const untagButton = new ButtonBuilder()
    .setCustomId(JSON.stringify({ button: TAG_BUTTON.TRY_UNTAG, command: 'play', subcommand: 'tag', tagIndex: curTagIndex }))
    .setLabel('Untag')
    .setEmoji('🚫')
    .setStyle(ButtonStyle.Secondary);

  const buttonsRow = new ActionRowBuilder<ButtonBuilder>();
  if (pagesNeeded) {
    buttonsRow.addComponents(backButton, playButton, nextButton, creatureButton, untagButton);
  } else {
    buttonsRow.addComponents(playButton, creatureButton, untagButton);
  }

  return { embeds: [embed], components: [selectRow, buttonsRow] };
}
