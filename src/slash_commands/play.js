//const rewardNames = Object.keys(require('./../data/rewardsData.js').rewards)
//const rewards = require('./../data/rewardsData.js').rewards;
const logger = require('./../logger.js').logger;
//const { getVoiceConnection, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const { SlashCommandBuilder } = require('@discordjs/builders');
BigInt.prototype.toJSON = function() { return this.toString() }

//#region SlashCommand
const data = new SlashCommandBuilder()
  .setName('play')
  .setDescription('Play a sound!')
  .addSubcommand(subcommand =>
    subcommand
      .setName('tag')
      .setDescription('play a tagged sound')
      .addStringOption(option => 
        option.setName('named')
        .setDescription('choose a tag')
        .setRequired(true)
        .setAutocomplete(true)))
  .addSubcommand(subcommand =>
    subcommand
      .setName('random')
      .setDescription('play a random sound'))
  .addSubcommand(subcommand =>
    subcommand
      .setName('creature')
      .setDescription('play a random sound from a creature')
      .addStringOption(option => 
        option.setName('named')
        .setDescription('choose a creature name')
        .setRequired(true)
        .setAutocomplete(true)));
//#endregion

module.exports = {
	data: data,
	async execute(interaction) {
    const subcommand = interaction.client.bosstalk.subCommands.get(`${interaction.commandName}${interaction.options._subcommand}`);
    if (!subcommand) return;
    return await subcommand.execute(interaction);
  },
  async autocomplete(interaction){
    const subcommand = interaction.client.bosstalk.subCommands.get(`${interaction.commandName}${interaction.options._subcommand}`);
    if (!subcommand) throw logger.error(`Subcommand not found!`);
    return await subcommand.autocomplete(interaction);
  },
  async button(interaction){
    const data = JSON.parse(interaction.customId);
    const subcommand = interaction.client.bosstalk.subCommands.get(`${data.command}${data.subcommand}`);
    if (!subcommand) throw logger.error(`Subcommand not found!`);
    return await subcommand.button(interaction);
  },
  async select(interaction){
    const data = JSON.parse(interaction.customId);
    const subcommand = interaction.client.bosstalk.subCommands.get(`${data.command}${data.subcommand}`);
    if (!subcommand) throw logger.error(`Subcommand not found!`);
    return await subcommand.select(interaction);
  },
  async modal(interaction){
    const data = JSON.parse(interaction.customId);
    const subcommand = interaction.client.bosstalk.subCommands.get(`${data.command}${data.subcommand}`);
    if (!subcommand) throw logger.error(`Subcommand not found!`);
    return await subcommand.modal(interaction);
  }
};


