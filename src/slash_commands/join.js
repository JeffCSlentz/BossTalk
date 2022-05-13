const { joinVoiceChannel, createAudioPlayer} = require('@discordjs/voice');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');
//const logger = require('./../src/logger.js').logger;

module.exports = {
	data: new SlashCommandBuilder()
		.setName('join')
		.setDescription('Joins your voice channel!'),
	async execute(interaction) {
    return await attemptJoin(interaction);
	},
  async button(interaction) {
    return await attemptJoin(interaction);
  }
};

async function attemptJoin(interaction){
  //If user not in a channel
  if ( !interaction.member.voice.channel ) {
    const embed = new MessageEmbed()
        .setColor('#ed5121')
        .addField('( ´･･)ﾉ(._.\`)', `You're not in a voice channel you silly goose`)
    return interaction.reply({embeds:[embed], ephemeral: true});
    /*
    await new Promise(resolve => setTimeout(resolve, 2000));
    return await message.delete();*/
  }

  //Attempt to join the user's channel
  const connection = joinVoiceChannel({
    channelId: interaction.member.voice.channel.id,
    guildId: interaction.guild.id,
    adapterCreator: interaction.guild.voiceAdapterCreator,
  });
  connection.subscribe(createAudioPlayer())

  return await interaction.deferUpdate();
  const embed = new MessageEmbed()
    .setColor('#0099ff')
    .setTitle(`(●'◡'●) I'm in`)
  let message = await interaction.reply({embeds:[embed], /*ephemeral: true,*/ fetchReply: true});
  await new Promise(resolve => setTimeout(resolve, 2000));
  return await message.delete();
}