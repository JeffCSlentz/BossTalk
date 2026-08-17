import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { BotCommand } from '../types/Command';
import { ensureVoiceConnection } from '../voice/ensureConnection';
import { buildNotInVoiceChannelPayload } from '../payloads/notInVoiceChannel';

async function attemptJoin(interaction: any) {
  const connection = await ensureVoiceConnection(interaction);
  if (!connection) return buildNotInVoiceChannelPayload();

  const embed = new EmbedBuilder().setColor('#0099ff').setTitle(`(●'◡'●) I'm in`);
  return { embeds: [embed] };
}

const command: BotCommand = {
  data: new SlashCommandBuilder().setName('join').setDescription('Joins your voice channel!'),
  async execute(interaction) {
    return interaction.reply(await attemptJoin(interaction));
  },
  async button(interaction) {
    const payload = await attemptJoin(interaction);
    if (payload) return interaction.reply(payload);
    return interaction.deferUpdate();
  },
};

export default command;
