const { getFileNameFromFilePath } = require('../utility.js')
const { MessageActionRow, MessageButton, MessageEmbed, MessageSelectMenu } = require('discord.js');
const TaggedSoundsMessagePayload = require('./TaggedSoundsMessagePayload.js');

class UntagAdminNeededMessagePayload{
  embeds = [];
  components = [];
  #tagName;
  #fileName;
  #user;
  #originalAuthor
  static BUTTON = {A_UNTAG:"A_UNTAG"};

  /**
   * 
   * @param {*} tagName 
   * @param {*} fileName 
   */
  constructor(tagName, fileName, user, originalAuthor) {
    this.#tagName = tagName;
    this.#fileName = fileName;
    this.#user = user;
    this.#originalAuthor = originalAuthor;
    this.embeds = this.#buildEmbeds();
    this.components = this.#buildComponents();
  }

  #buildEmbeds(){
    const embed = new MessageEmbed()
        .setColor('#ed5121')
        .addField(`Admin Needed`, `${this.#user} tried to untag **${this.#tagName}** from **${this.#fileName}** but isn't the tag author.`)
    return [embed];
  }

  #buildComponents(){
    return [this.#buildButtons()]
  }

  #buildButtons(){
    const undoUntagButton = new MessageButton()
      .setCustomId(JSON.stringify({
        button: UntagAdminNeededMessagePayload.BUTTON.A_UNTAG,
        command: 'play',
        subcommand: 'tag',
        author: this.#originalAuthor,
      }))
      .setLabel('Admin: Untag')
      .setStyle('DANGER')
        
    return new MessageActionRow().addComponents([undoUntagButton]);
  }
}
  
module.exports = UntagAdminNeededMessagePayload;