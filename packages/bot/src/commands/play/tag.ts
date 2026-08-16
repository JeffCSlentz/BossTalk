import { getVoiceConnection, VoiceConnectionStatus } from '@discordjs/voice';
import { PermissionsBitField } from 'discord.js';
import { BotCommand } from '../../types/Command';
import { playUrl } from '../../services/playback';
import { setMessageState, getMessageState } from '../../services/interactionState';
import { buildTaggedSoundsPayload, TAG_BUTTON } from '../../payloads/taggedSounds';
import { buildJoinChannelPayload } from '../../payloads/joinChannel';
import { buildErrorPayload } from '../../payloads/error';
import { buildUntagSuccessPayload, UNTAG_SUCCESS_BUTTON, UndoState } from '../../payloads/untagSuccess';
import { buildUntagAdminNeededPayload, UNTAG_ADMIN_BUTTON } from '../../payloads/untagAdminNeeded';
import { fileNameFromR2Url } from '../../util/soundDisplay';

const command: BotCommand = {
  data: { name: 'tag' },
  async execute(interaction) {
    const tagName = interaction.options.getString('named');
    const allTags = interaction.client.bot.guildTags.get(interaction.guildId);
    const matched = allTags.filter((t: any) => t.tag === tagName);
    if (matched.length === 0) {
      return interaction.reply(buildErrorPayload("I didn't find that tag", '(┬┬﹏┬┬)'));
    }
    const tag = matched[Math.floor(Math.random() * matched.length)];
    const tagIndex = allTags.findIndex((t: any) => t.tag === tag.tag && t.r2Url === tag.r2Url);
    await playUrl(interaction.guildId, tag.r2Url);
    interaction.client.bot.stats.playedSound(interaction.guildId, interaction.member.id, interaction.member.user.username, tag.r2Url);
    return interaction.reply(buildTaggedSoundsPayload(allTags, tagIndex));
  },
  async autocomplete(interaction) {
    const input = (interaction.options.getFocused() as string).toLowerCase();
    const tags = interaction.client.bot.guildTags.get(interaction.guildId);
    if (tags.length === 0) {
      return interaction.respond([{ name: 'Whoops, no tags found :(', value: 'oops' }]);
    }
    const matches = input ? tags.filter((t: any) => t.tag.toLowerCase().includes(input)) : tags;
    return interaction.respond(matches.slice(0, 20).map((t: any) => ({ name: t.tag, value: t.tag })));
  },
  async button(interaction) {
    const data = JSON.parse(interaction.customId);
    const allTags = interaction.client.bot.guildTags.get(interaction.guildId);

    switch (data.button) {
      case TAG_BUTTON.FLIP:
        return interaction.update(buildTaggedSoundsPayload(allTags, data.tagIndex));

      case TAG_BUTTON.PLAY: {
        const connection = getVoiceConnection(interaction.guildId);
        if (!connection || connection.state?.status === VoiceConnectionStatus.Disconnected) {
          return interaction.reply(buildJoinChannelPayload());
        }
        const tag = allTags[data.tagIndex];
        if (!tag) return interaction.reply(buildErrorPayload());
        await playUrl(interaction.guildId, tag.r2Url);
        interaction.client.bot.stats.playedSound(interaction.guildId, interaction.member.id, interaction.member.user.username, tag.r2Url);
        return interaction.deferUpdate();
      }

      case TAG_BUTTON.TRY_UNTAG: {
        const tag = allTags[data.tagIndex];
        if (!tag) return interaction.reply(buildErrorPayload('Untagging failed. Try /play tag again.'));

        const isAuthor = tag.author === interaction.member.id;
        const isAdmin = interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator);
        const fileName = fileNameFromR2Url(tag.r2Url);
        const removed: UndoState = { tag: tag.tag, r2Url: tag.r2Url, author: tag.author };

        if (!isAuthor && !isAdmin) {
          await interaction.reply(buildUntagAdminNeededPayload(tag.tag, fileName, `<@${interaction.member.id}>`));
          const message = await interaction.fetchReply();
          setMessageState(message.id, removed);
          return;
        }

        interaction.client.bot.guildTags.remove(interaction.guildId, data.tagIndex);
        await interaction.reply(buildUntagSuccessPayload(tag.tag, fileName));
        const message = await interaction.fetchReply();
        setMessageState(message.id, removed);
        return;
      }

      case UNTAG_ADMIN_BUTTON.A_UNTAG: {
        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
          return interaction.reply(buildErrorPayload("Hey wait a minute! You're not an admin :("));
        }
        const removed = getMessageState<UndoState>(interaction.message.id);
        if (!removed) return interaction.reply(buildErrorPayload());
        const tags = interaction.client.bot.guildTags.get(interaction.guildId);
        const idx = tags.findIndex((t: any) => t.tag === removed.tag && t.r2Url === removed.r2Url);
        if (idx >= 0) interaction.client.bot.guildTags.remove(interaction.guildId, idx);
        await interaction.update(buildUntagSuccessPayload(removed.tag, fileNameFromR2Url(removed.r2Url)));
        setMessageState(interaction.message.id, removed);
        return;
      }

      case UNTAG_SUCCESS_BUTTON.UNDO_UNTAG: {
        const removed = getMessageState<UndoState>(interaction.message.id);
        if (!removed) return interaction.reply(buildErrorPayload());
        interaction.client.bot.guildTags.add(interaction.guildId, removed.tag, removed.r2Url, removed.author);
        return interaction.message.delete();
      }
    }
  },
  async select(interaction) {
    const allTags = interaction.client.bot.guildTags.get(interaction.guildId);
    const tagIndex = parseInt(interaction.values[0], 10);
    const tag = allTags[tagIndex];
    if (!tag) return interaction.reply(buildErrorPayload());
    await playUrl(interaction.guildId, tag.r2Url);
    interaction.client.bot.stats.playedSound(interaction.guildId, interaction.member.id, interaction.member.user.username, tag.r2Url);
    return interaction.update(buildTaggedSoundsPayload(allTags, tagIndex));
  },
};

export default command;
