import { SlashCommandBuilder, EmbedBuilder, GuildMember } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer } from '@discordjs/voice';
import { BotCommand } from '../types/Command';

async function attemptJoin(interaction: any) {
  const member = interaction.member as GuildMember;
  if (!member.voice.channel) {
    const embed = new EmbedBuilder()
      .setColor('#ed5121')
      .addFields([{ name: '( ´･･)ﾉ(._.`)', value: "You're not in a voice channel you silly goose" }]);
    return { embeds: [embed], ephemeral: true };
  }

  const connection = joinVoiceChannel({
    channelId: member.voice.channel.id,
    guildId: interaction.guild.id,
    adapterCreator: interaction.guild.voiceAdapterCreator,
  });
  connection.subscribe(createAudioPlayer());

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
