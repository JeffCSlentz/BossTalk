import { SlashCommandBuilder } from 'discord.js';
import { BotCommand } from '../../types/Command';
import tagsCommand from './tags';

const data = new SlashCommandBuilder()
  .setName('list')
  .setDescription('List')
  .addSubcommand((sub) => sub.setName('tags').setDescription('List all the tags'));

const subcommands: Record<string, BotCommand> = { tags: tagsCommand };

const command: BotCommand = {
  data,
  async execute(interaction) {
    return subcommands[interaction.options.getSubcommand()]?.execute?.(interaction);
  },
};

export default command;
