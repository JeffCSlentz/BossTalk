import { EmbedBuilder } from 'discord.js';
import { Tag } from '../types/Tag';

const ITEMS_PER_EMBED = 240;
const COLUMNS = 3;

export function buildAllTagsPayload(tags: Tag[]) {
  if (tags.length === 0) {
    return {
      embeds: [
        new EmbedBuilder()
          .setColor('#0099ff')
          .setTitle('＞﹏＜ No tags left!')
          .addFields([{ name: 'ᓚᘏᗢ', value: "Here's a cat instead" }]),
      ],
    };
  }

  const tagNames = [...new Set(tags.map((t) => (t.tag.length > 15 ? t.tag.slice(0, 15) + '...' : t.tag)))];
  const embedsNeeded = Math.ceil(tagNames.length / ITEMS_PER_EMBED);
  const embeds: EmbedBuilder[] = [];

  for (let i = 0; i < embedsNeeded; i++) {
    const tagIndex = i * ITEMS_PER_EMBED;
    const embed = new EmbedBuilder().setColor('#0099ff').setTitle('Tags' + (embedsNeeded > 1 ? `, Page ${i + 1}` : ''));
    const fields = [];
    for (let j = 0; j < COLUMNS; j++) {
      const start = tagIndex + (ITEMS_PER_EMBED / COLUMNS) * j;
      if (start > tagNames.length) break;
      fields.push({
        name: '​',
        value: tagNames.slice(start, start + ITEMS_PER_EMBED / COLUMNS).join('\n') || '​',
        inline: true,
      });
    }
    embed.addFields(fields);
    embeds.push(embed);
  }

  return { embeds };
}
