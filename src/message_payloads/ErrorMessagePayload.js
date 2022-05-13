const { getFileNameFromFilePath: fileName } = require('../utility.js')
const { MessageActionRow, MessageButton, MessageEmbed, MessageSelectMenu } = require('discord.js');

class ErrorMessagePayload{
  embeds = [];
  components = [];
  #title = `¯\\\_(ツ)_/¯`;
  #errorMessage = `Something went wrong!`;
  
  /**
   * @description Ephemeral by default w/ a red border
   * @param {{title:title}}
   * @param {{errorMessage:errorMessage}}
   */
  constructor({title = `¯\\\_(ツ)_/¯`, errorMessage = `Something went wrong!`} = {}) {
    this.#title = title;
    this.#errorMessage = errorMessage;
    this.embeds = this.#buildEmbeds();
    this.ephemeral = true;
  }

  #buildEmbeds(){
    const embed = new MessageEmbed()
        .setColor('#ed5121')
        .addField(this.#title, this.#errorMessage)
    return [embed];
  }
}
  
module.exports = ErrorMessagePayload;