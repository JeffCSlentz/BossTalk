const { joinVoiceChannel, createAudioPlayer} = require('@discordjs/voice');
const { SlashCommandBuilder } = require('@discordjs/builders');
const logger = require('../logger.js').logger;

module.exports = {
	data: new SlashCommandBuilder()
		.setName('joinayy')
		.setDescription('Joins a very specific voice channel'),
	async execute(interaction) {

    //Attempt to join the user's channel
    if(true){
      const connection = joinVoiceChannel({
        channelId: "442940775307935744",
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
      });
      connection.subscribe(createAudioPlayer())
      return await interaction.reply(`Joined 442940775307935744! :)`);
    }

    //If user not in a channel
    if (!interaction.member.voice) {
      return await interaction.reply(`I can only join the channel you're in, ${message.author}!`);
    }
	},
};
