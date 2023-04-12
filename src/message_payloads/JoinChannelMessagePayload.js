const { getFileNameFromFilePath: fileName } = require('../utility.js')
const { ActionRowBuilder, ButtonBuilder, EmbedBuilder, StringSelectMenuBuilder, ButtonStyle } = require('discord.js');

class JoinChannelMessagePayload{
  embeds = [];
  components = [];
  

  constructor() {
    this.embeds = this.#buildEmbeds();
    this.components = this.#buildComponents();
    this.ephemeral = true;
  }

  #buildEmbeds(){
    const embed = new EmbedBuilder()
        .setColor('#ed5121')
        .addFields([
          {name: '¯\\\_(ツ)_/¯', value:'I tried to play a sound but I\'m not in a channel!'}
        ])
    return [embed];
  }

  #buildComponents(){
    return [this.#buildButtons()]
  }

  #buildButtons(){
    const joinButton = new ButtonBuilder()
        .setCustomId(JSON.stringify({
                command: 'join',
            }))
        .setLabel('Join?')
        .setStyle(ButtonStyle.Secondary)
        
    return new ActionRowBuilder().addComponents([joinButton]);
  }
}
  
module.exports = JoinChannelMessagePayload;