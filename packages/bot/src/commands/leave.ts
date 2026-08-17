import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { getVoiceConnection } from '@discordjs/voice';
import { BotCommand } from '../types/Command';

const command: BotCommand = {
  data: new SlashCommandBuilder().setName('leave').setDescription('Leaves your voice channel!'),
  async execute(interaction) {
    const connection = getVoiceConnection(interaction.guildId);
    if (!connection) {
      const embed = new EmbedBuilder().setColor('#ed5121').addFields([{ name: '¯\\_(ツ)_/¯', value: "I'm not in a voice channel!" }]);
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
    connection.destroy();
    const embed = new EmbedBuilder().setColor('#0099ff').setTitle(`(´｡• ᵕ •｡\`) See ya!`);
    return interaction.reply({ embeds: [embed] });
  },
};

export default command;
