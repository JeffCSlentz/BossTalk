import { Client, Events, VoiceState } from 'discord.js';
import { getVoiceConnection } from '@discordjs/voice';
import logger from '../logger';

export function registerVoiceHandlers(client: Client): void {
  client.on(Events.VoiceStateUpdate, (oldState: VoiceState, newState: VoiceState) => {
    const connection = getVoiceConnection(oldState.guild.id);
    if (!connection) return;

    const botId = client.user?.id;
    const botChannelId = connection.joinConfig.channelId;

    // Bot was disconnected from a channel.
    if (oldState.member?.id === botId && !newState.channelId) {
      connection.destroy();
      logger.info(`Bot was disconnected from ${oldState.guild.name}.`);
      return;
    }

    // Someone left the bot's channel — check if it's now empty.
    if (oldState.channelId === botChannelId && oldState.channel) {
      const nonBotMembers = oldState.channel.members.filter((m) => !m.user.bot);
      if (nonBotMembers.size === 0) {
        connection.destroy();
        logger.info(`No users left in ${oldState.guild.name} — disconnected.`);
      }
    }
  });
}
