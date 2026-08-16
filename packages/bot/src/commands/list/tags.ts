import { BotCommand } from '../../types/Command';
import { buildAllTagsPayload } from '../../payloads/allTags';

const command: BotCommand = {
  data: { name: 'tags' },
  async execute(interaction) {
    const allTags = interaction.client.bot.guildTags.get(interaction.guildId);
    return interaction.reply(buildAllTagsPayload(allTags));
  },
};

export default command;
