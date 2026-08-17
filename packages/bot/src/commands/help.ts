import { SlashCommandBuilder } from 'discord.js';
import { BotCommand } from '../types/Command';
import { buildHelpPayload } from '../payloads/help';

const command: BotCommand = {
  data: new SlashCommandBuilder().setName('help').setDescription('See what BossTalk can do'),
  async execute(interaction) {
    return interaction.reply(buildHelpPayload());
  },
};

export default command;
