import { SlashCommandBuilder } from 'discord.js';
import { BotCommand } from '../../types/Command';
import randomCommand from './random';
import creatureCommand from './creature';
import tagCommand from './tag';

const data = new SlashCommandBuilder()
  .setName('play')
  .setDescription('Play a sound!')
  .addSubcommand((sub) =>
    sub
      .setName('tag')
      .setDescription('play a tagged sound')
      .addStringOption((o) => o.setName('named').setDescription('choose a tag').setRequired(true).setAutocomplete(true))
  )
  .addSubcommand((sub) => sub.setName('random').setDescription('play a random sound'))
  .addSubcommand((sub) =>
    sub
      .setName('creature')
      .setDescription('play a random sound from a creature')
      .addStringOption((o) => o.setName('named').setDescription('choose a creature name').setRequired(true).setAutocomplete(true))
  );

const subcommands: Record<string, BotCommand> = {
  random: randomCommand,
  creature: creatureCommand,
  tag: tagCommand,
};

const command: BotCommand = {
  data,
  async execute(interaction) {
    return subcommands[interaction.options.getSubcommand()]?.execute?.(interaction);
  },
  async autocomplete(interaction) {
    return subcommands[interaction.options.getSubcommand()]?.autocomplete?.(interaction);
  },
  async button(interaction) {
    const { subcommand } = JSON.parse(interaction.customId);
    return subcommands[subcommand]?.button?.(interaction);
  },
  async select(interaction) {
    const { subcommand } = JSON.parse(interaction.customId);
    return subcommands[subcommand]?.select?.(interaction);
  },
  async modal(interaction) {
    const { subcommand } = JSON.parse(interaction.customId);
    return subcommands[subcommand]?.modal?.(interaction);
  },
};

export default command;
