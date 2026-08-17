import { getVoiceConnection, VoiceConnectionStatus } from '@discordjs/voice';
import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { BotCommand } from '../../types/Command';
import { SoundState } from '../../types/SoundState';
import { playUrl } from '../../services/playback';
import { setMessageState, getMessageState } from '../../services/interactionState';
import { ensureVoiceConnection } from '../../voice/ensureConnection';
import { buildSoundPayload, Creature } from '../../payloads/sound';
import { buildJoinChannelPayload } from '../../payloads/joinChannel';
import { buildNotInVoiceChannelPayload } from '../../payloads/notInVoiceChannel';
import { buildErrorPayload } from '../../payloads/error';
import { transcriptSnippet } from '../../util/soundDisplay';

async function loadCreature(interaction: any, slug: string): Promise<Creature | null> {
  const sounds = await interaction.client.bot.catalog.byCreature(slug);
  if (sounds.length === 0) return null;
  return { name: sounds[0].creatureName, slug, sounds };
}

function stateFor(creature: Creature, soundIndex: number): SoundState {
  const sound = creature.sounds[soundIndex];
  return { objectID: sound.objectID, creatureSlug: creature.slug, r2Url: sound.r2Url };
}

function tagCount(interaction: any): number {
  return interaction.client.bot.guildTags.get(interaction.guildId).length;
}

const command: BotCommand = {
  data: { name: 'sound' },
  async execute(interaction) {
    const connection = await ensureVoiceConnection(interaction);
    if (!connection) return interaction.reply(buildNotInVoiceChannelPayload());

    const slug = interaction.options.getString('search');
    const creature = await loadCreature(interaction, slug);
    if (!creature) return interaction.reply(buildErrorPayload('Creature not found'));
    await playUrl(interaction.guildId, creature.sounds[0].r2Url);
    interaction.client.bot.stats.playedSound(interaction.guildId, interaction.member.id, interaction.member.user.username, creature.sounds[0].objectID);
    await interaction.reply(buildSoundPayload(creature, 0, tagCount(interaction)));
    const message = await interaction.fetchReply();
    setMessageState(message.id, stateFor(creature, 0));
  },
  async autocomplete(interaction) {
    const input = interaction.options.getFocused();
    const hits = await interaction.client.bot.catalog.searchCreatures(input, 20);
    return interaction.respond(
      hits.map((h: any) => {
        // Showing the quote (when there is one) whenever a hit has a transcript —
        // not just when it's *why* this hit matched — teaches users that typing
        // dialogue works too, without needing Algolia's highlight-result plumbing
        // to figure out which attribute the match actually came from.
        const snippet = transcriptSnippet(h.transcript, 6);
        const label = snippet ? `${h.creatureName} — "${snippet}"` : h.creatureName;
        return { name: label.slice(0, 100), value: h.creatureSlug.slice(0, 100) };
      })
    );
  },
  async button(interaction) {
    const data = JSON.parse(interaction.customId);
    const state = getMessageState<SoundState>(interaction.message.id);
    if (!state) return interaction.reply(buildErrorPayload());
    const creature = await loadCreature(interaction, state.creatureSlug);
    if (!creature) return interaction.reply(buildErrorPayload('Creature not found'));

    switch (data.button) {
      case 'flip': {
        const soundIndex = Math.min(Math.max(data.soundIndex, 0), creature.sounds.length - 1);
        await interaction.update(buildSoundPayload(creature, soundIndex, tagCount(interaction)));
        setMessageState(interaction.message.id, stateFor(creature, soundIndex));
        return;
      }
      case 'play': {
        const connection = getVoiceConnection(interaction.guildId);
        if (!connection || connection.state?.status === VoiceConnectionStatus.Disconnected) {
          return interaction.reply(buildJoinChannelPayload());
        }
        const sound = creature.sounds[data.soundIndex] ?? creature.sounds[0];
        await playUrl(interaction.guildId, sound.r2Url);
        interaction.client.bot.stats.playedSound(interaction.guildId, interaction.member.id, interaction.member.user.username, sound.objectID);
        return interaction.deferUpdate();
      }
      case 'creatureR': {
        // "Show Creature" button clicked from a RandomMessagePayload/TaggedSoundsMessagePayload embed — posts a new message.
        const idx = creature.sounds.findIndex((s) => s.objectID === state.objectID);
        const soundIndex = idx >= 0 ? idx : 0;
        await interaction.reply(buildSoundPayload(creature, soundIndex, tagCount(interaction)));
        const message = await interaction.fetchReply();
        setMessageState(message.id, stateFor(creature, soundIndex));
        return;
      }
      case 'tag': {
        const modal = new ModalBuilder()
          .setCustomId(JSON.stringify({ command: 'play', subcommand: 'sound', modal: 'tag' }))
          .setTitle("Tagging a Sound (●'◡'●)");
        const tagNameInput = new TextInputBuilder().setCustomId('tagNameInput').setLabel('Enter a tag for this sound').setStyle(TextInputStyle.Short);
        modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(tagNameInput));
        return interaction.showModal(modal);
      }
    }
  },
  async select(interaction) {
    const state = getMessageState<SoundState>(interaction.message.id);
    if (!state) return interaction.reply(buildErrorPayload());
    const creature = await loadCreature(interaction, state.creatureSlug);
    if (!creature) return interaction.reply(buildErrorPayload('Creature not found'));
    const soundIndex = parseInt(interaction.values[0], 10);
    const sound = creature.sounds[soundIndex];
    await playUrl(interaction.guildId, sound.r2Url);
    interaction.client.bot.stats.playedSound(interaction.guildId, interaction.member.id, interaction.member.user.username, sound.objectID);
    await interaction.update(buildSoundPayload(creature, soundIndex, tagCount(interaction)));
    setMessageState(interaction.message.id, stateFor(creature, soundIndex));
  },
  async modal(interaction) {
    const tagName = interaction.fields.getTextInputValue('tagNameInput');
    const state = getMessageState<SoundState>(interaction.message?.id);
    if (!state) return interaction.reply(buildErrorPayload());

    if (tagName.includes('*')) {
      return interaction.reply(buildErrorPayload(`Sorry, i'm too dumb to handle asterisks`));
    }

    const existing = interaction.client.bot.guildTags.get(interaction.guildId);
    if (existing.some((t: any) => t.tag === tagName && t.r2Url === state.r2Url)) {
      return interaction.reply(buildErrorPayload(`Tag **${tagName}** already exists for that sound`));
    }

    interaction.client.bot.guildTags.add(interaction.guildId, tagName, state.r2Url, interaction.member.id);
    return interaction.reply(`༼ つ ◕_◕ ༽つ Tag **${tagName}** created!`);
  },
};

export default command;
