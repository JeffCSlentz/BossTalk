import { getVoiceConnection, joinVoiceChannel, createAudioPlayer, VoiceConnection, VoiceConnectionStatus } from '@discordjs/voice';
import { GuildMember } from 'discord.js';

/**
 * Returns the guild's existing voice connection, or joins the invoking
 * member's current channel and returns that instead. Returns null only when
 * the member isn't in a voice channel at all — callers show the "not in a
 * channel" message in that case.
 */
export async function ensureVoiceConnection(interaction: any): Promise<VoiceConnection | null> {
  const existing = getVoiceConnection(interaction.guildId);
  if (existing && existing.state.status !== VoiceConnectionStatus.Destroyed) return existing;

  const member = interaction.member as GuildMember;
  if (!member.voice.channel) return null;

  const connection = joinVoiceChannel({
    channelId: member.voice.channel.id,
    guildId: interaction.guild.id,
    adapterCreator: interaction.guild.voiceAdapterCreator,
  });
  connection.subscribe(createAudioPlayer());
  return connection;
}
