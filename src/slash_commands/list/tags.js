//Creates the creature card and allows you to play files from it, browse sounds, etc.
const { playCreature, getSoundsFromCreatureName, getFilePathFromFileName, getFileNameFromFilePath, getCreatureFromFileName, tagSort } = require('../../utility.js');
const { getVoiceConnection, VoiceConnectionStatus } = require('@discordjs/voice');
const CreatureMessagePayload = require('../../message_payloads/CreatureMessagePayload.js');
const JoinChannelMessagePayload = require('../../message_payloads/JoinChannelMessagePayload');
const Fuse = require('fuse.js');
const Creature = require('../../classes/Creature');
const AllTagsMessagePayload = require('../../message_payloads/AllTagsMessagePayload.js');
const ErrorMessagePayload = require('../../message_payloads/ErrorMessagePayload.js');
const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const BossTalk = require('../../BossTalk.js');

module.exports = {
    data: {name: "tags"},
	async execute(interaction) {
        const allTagsArray = interaction.client.bosstalk.guildTags.get(interaction.guildId).sort(tagSort);

        let payload = new AllTagsMessagePayload(
            allTagsArray,
            interaction.client.bosstalk.sounds
          );
    
        //We need to update the message when a change in guildTags is detected.
        //Send tags payload, save the function signature to message.x
        //reloadTagsMessage is "wrapped" with bind to have access to it's original arguments
        let message = await interaction.reply(payload);
        message.x = reloadTagsMessage.bind(interaction.client.bosstalk,interaction,message)
        interaction.client.bosstalk.on(BossTalk.EVENTS.GUILD_TAGS_CHANGED(interaction.guildId), message.x)
    }
}

/**
 * @description This function is passed to the bosstalk event emitter as a way to change the tags message whenever the tags change.
 * @param {*} interaction 
 * @param {*} message 
 * @returns 
 */
async function reloadTagsMessage(interaction, message){
    const EVENT_NAME = BossTalk.EVENTS.GUILD_TAGS_CHANGED(interaction.guildId);
    const allTagsArray = interaction.client.bosstalk.guildTags.get(interaction.guildId);
  
    //Remove an excess old listener once this guild has more than 10 (to avoid memory leaks)
    if (this.getEventListeners(this, EVENT_NAME).length > 10){
      this.removeListener(EVENT_NAME, message.x)
      return await message.edit(`**Auto update disabled** (* ￣︿￣)`);
    }
  
    let newMessage = await message.fetch();
  
    let fileName = getFromTagsEmbed(newMessage, "Sound");
    let tagName = getFromTagsEmbed(newMessage, "Tag");
  
    let curTagIndex = allTagsArray.findIndex(t => t.tag == tagName && getFileNameFromFilePath(t.filePath) == fileName)
  
    //Tag not found. Find the index where fileName fits in alphabetically to the allTagsArray
    if(curTagIndex < 0){
      for(const [i,t] of allTagsArray.entries()){
        curTagIndex = i;
        let alph = t.tag.localeCompare(tagName);
        if(alph > 0) break;
      }
    }
  
    //Sanity check
    if(curTagIndex < 0 || curTagIndex >= allTagsArray.length) throw logger.error('curTagIndex must be between 0 and allTagsArray.length');
  
    let payload = new TaggedSoundsMessagePayload(
      interaction.client.bosstalk.guildTags.get(interaction.guildId),
      interaction.client.bosstalk.sounds,
      curTagIndex,
    );
    payload.fetchReply = false;
    return await message.edit(payload);
  }