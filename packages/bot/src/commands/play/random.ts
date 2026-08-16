import { getVoiceConnection, VoiceConnectionStatus } from '@discordjs/voice';
import { BotCommand } from '../../types/Command';
import { SoundState } from '../../types/SoundState';
import { playUrl } from '../../services/playback';
import { setMessageState, getMessageState } from '../../services/interactionState';
import { buildRandomPayload } from '../../payloads/random';
import { buildJoinChannelPayload } from '../../payloads/joinChannel';
import { buildErrorPayload } from '../../payloads/error';
import { CatalogEntry } from '../../services/catalog';

function toState(sound: CatalogEntry): SoundState {
  return { objectID: sound.objectID, creatureSlug: sound.creatureSlug, r2Url: sound.r2Url };
}

const command: BotCommand = {
  data: { name: 'random' },
  async execute(interaction) {
    const sound = await interaction.client.bot.catalog.random();
    if (!sound) return interaction.reply(buildErrorPayload("Couldn't find a sound, sorry!"));
    await playUrl(interaction.guildId, sound.r2Url);
    interaction.client.bot.stats.playedSound(interaction.guildId, interaction.member.id, interaction.member.user.username, sound.objectID);
    await interaction.reply(buildRandomPayload(sound, interaction.client.bot.pictures));
    const message = await interaction.fetchReply();
    setMessageState(message.id, toState(sound));
  },
  async button(interaction) {
    const data = JSON.parse(interaction.customId);
    switch (data.button) {
      case 'play': {
        const state = getMessageState<SoundState>(interaction.message.id);
        const connection = getVoiceConnection(interaction.guildId);
        if (!connection || connection.state?.status === VoiceConnectionStatus.Disconnected) {
          return interaction.reply(buildJoinChannelPayload());
        }
        if (!state) {
          return interaction.reply(buildErrorPayload());
        }
        await playUrl(interaction.guildId, state.r2Url);
        interaction.client.bot.stats.playedSound(interaction.guildId, interaction.member.id, interaction.member.user.username, state.objectID);
        return interaction.deferUpdate();
      }
      case 'reroll': {
        const sound = await interaction.client.bot.catalog.random();
        if (!sound) return interaction.reply(buildErrorPayload("Couldn't find a sound, sorry!"));
        await interaction.update(buildRandomPayload(sound, interaction.client.bot.pictures));
        setMessageState(interaction.message.id, toState(sound));
        return;
      }
    }
  },
};

export default command;
