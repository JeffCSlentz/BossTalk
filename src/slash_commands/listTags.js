const logger = require('../logger.js').logger;
const { SlashCommandBuilder } = require('@discordjs/builders');
BigInt.prototype.toJSON = function() { return this.toString() }

//#region SlashCommand
const data = new SlashCommandBuilder()
  .setName('list')
  .setDescription('List')
  .addSubcommand(subcommand =>
    subcommand
      .setName('tags')
      .setDescription('List all the tags')
  )
//#endregion

module.exports = {
	data: data,
	async execute(interaction) {
    const subcommand = interaction.client.bosstalk.subCommands.get(`${interaction.commandName}${interaction.options._subcommand}`);
    if (!subcommand) return;
    return await subcommand.execute(interaction);
  },
};


