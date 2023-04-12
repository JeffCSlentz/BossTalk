const { getFileNameFromFilePath } = require('../utility.js')
const { ActionRowBuilder, ButtonBuilder, EmbedBuilder, StringSelectMenuBuilder, ButtonStyle } = require('discord.js');

class UntagSuccessMessagePayload{
  embeds = [];
  components = [];
  #tagName = '';
  #fileName = '';
  #author;
  static BUTTON = {
    UNDO_UNTAG : "UNDO_UNTAG"
  }
  /**
   * 
   * @param {*} tagName 
   * @param {*} fileName 
   */
  constructor(tagName, fileName, author) {
    this.#tagName = tagName;
    this.#fileName = fileName;
    this.#author = author;
    this.embeds = this.#buildEmbeds();
    this.components = this.#buildComponents();

  }
  #buildEmbeds(){
    const embed = new EmbedBuilder()
        .setColor('#3ba55c')
        .addFields([
          {name: `(☞ﾟヮﾟ)☞ Untag Success!`, value:`I untagged **${this.#tagName}** from **${this.#fileName}**`}
        ])
    return [embed];
  }

  #buildComponents(){
    return [this.#buildButtons()]
  }

  #buildButtons(){
    const undoUntagButton = new ButtonBuilder()
      .setCustomId(JSON.stringify({
        button: UntagSuccessMessagePayload.BUTTON.UNDO_UNTAG,
        command: 'play',
        subcommand: 'tag',
        author: this.#author,
      }))
      .setLabel('Undo')
      .setStyle(ButtonStyle.Secondary)
        
    return new ActionRowBuilder().addComponents([undoUntagButton]);
  }
}
  
module.exports = UntagSuccessMessagePayload;