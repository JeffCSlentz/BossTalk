const { getFileNameFromFilePath: fileName } = require('../utility.js')
const { MessageActionRow, MessageButton, MessageEmbed, MessageSelectMenu } = require('discord.js');

class JoinChannelMessagePayload{
  embeds = [];
  components = [];
  

  constructor() {
    this.embeds = this.#buildEmbeds();
    this.components = this.#buildComponents();
    this.ephemeral = true;
  }

  #buildEmbeds(){
    const embed = new MessageEmbed()
        .setColor('#ed5121')
        .addField('¯\\\_(ツ)_/¯', `I tried to play a sound but I'm not in a channel!`)
    return [embed];
  }

  #buildComponents(){
    return [this.#buildButtons()]
  }

  #buildButtons(){
    const joinButton = new MessageButton()
        .setCustomId(JSON.stringify({
                command: 'join',
            }))
        .setLabel('Join?')
        .setStyle('SECONDARY')
        
    return new MessageActionRow().addComponents([joinButton]);
  }
}
  
module.exports = JoinChannelMessagePayload;