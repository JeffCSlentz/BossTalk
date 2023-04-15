const { playFile, getCreatureFromFileName, getFilePathFromFileName, getFileNameFromFilePath, tagSort } = require('../../utility.js');
const { getVoiceConnection, VoiceConnectionStatus } = require('@discordjs/voice');
const Fuse = require('fuse.js');
const logger = require('../../logger.js').logger;
const TaggedSoundsMessagePayload = require('../../message_payloads/TaggedSoundsMessagePayload');
const CreatureMessagePayload = require('../../message_payloads/CreatureMessagePayload');
const JoinChannelMessagePayload = require('../../message_payloads/JoinChannelMessagePayload');
const UntagSuccessMessagePayload = require('../../message_payloads/UntagSuccessMessagePayload');
const ErrorMessagePayload = require('../../message_payloads/ErrorMessagePayload');
const Creature = require('../../classes/Creature.js');
const { PermissionFlagsBits, PermissionsBitField } = require('discord.js');
const UntagAdminNeededMessagePayload = require('../../message_payloads/UntagAdminNeededMessagePayload.js');
const BossTalk = require('../../BossTalk.js');

module.exports = {
  data: {name: "tag"},
	async execute(interaction) {
      //Retrieve tags and get a random one.
      const allTagsArray = interaction.client.bosstalk.guildTags.get(interaction.guildId).sort(tagSort);
      const tagName = interaction.options.data[0].options[0].value;
      if(!tagName) throw logger.error('/tag called without tag option');
      const matchedTags = allTagsArray.filter(t => t.tag == tagName);
      if(matchedTags.length == 0) return await interaction.reply(new ErrorMessagePayload({title:'(┬┬﹏┬┬)', errorMessage:`I didn't find that tag`}));
      
      const tag = matchedTags[(Math.random() * matchedTags.length) | 0];
      const tagIndex = allTagsArray.findIndex(t => (t.filePath == tag.filePath && t.tag == tag.tag))
      playFile(interaction, tag.filePath);
      let payload = new TaggedSoundsMessagePayload(
        allTagsArray,
        interaction.client.bosstalk.sounds,
        tagIndex,
      );

      //We need to update the message when a change in guildTags is detected.
      //Send tags payload, save the function signature to message.x
      //reloadTagsMessage is "wrapped" with bind to have access to it's original arguments
      let message = await interaction.reply(payload);
      message.x = reloadTagsMessage.bind(interaction.client.bosstalk,interaction,message, tagIndex)
      interaction.client.bosstalk.on(BossTalk.EVENTS.GUILD_TAGS_CHANGED(interaction.guildId), message.x)
  },
  async autocomplete(interaction){
    const input = interaction.options.data[0].options[0].value
    const tags = interaction.client.bosstalk.guildTags.get(interaction.guildId).sort?.(tagSort)
    
    if(!tags){
      return await interaction.respond({name:"Whoops, no tags found :(", value:"oops"})
    }
    if(input){
      const matchingTags = new Fuse(tags.map(t => t.tag)).search(input).slice(0,20).map(i => ({name:i.item,value:i.item}))
      return await interaction.respond(matchingTags);
    }
    return await interaction.respond(tags.map(t => t.tag).slice(0,20).map(i => ({name:i,value:i})))
    
  },
  async button(interaction){
    const allTagsArray = interaction.client.bosstalk.guildTags.get(interaction.guildId).sort(tagSort);
    const data = JSON.parse(interaction.customId)
    let tagIndex = parseInt(data.tagIndex) || 0;
    let fileName;
    let tagName;
    let guildTags;
    switch (data.button){
        case TaggedSoundsMessagePayload.BUTTON.FLIP:
            return await interaction.update(new TaggedSoundsMessagePayload(allTagsArray, interaction.client.bosstalk.sounds, tagIndex));
        case TaggedSoundsMessagePayload.BUTTON.PLAY:
          const voiceConnection = getVoiceConnection(interaction.guildId)
          if(!voiceConnection || voiceConnection.state?.status === VoiceConnectionStatus.Disconnected){
            return await interaction.reply(new JoinChannelMessagePayload(interaction));
          }

          playFile(interaction, allTagsArray[tagIndex].filePath);
          return await interaction.deferUpdate();
        case TaggedSoundsMessagePayload.BUTTON.TRY_UNTAG:
          const i = JSON.parse(interaction?.customId).tagIndex;
          fileName = getFromTagsEmbed(interaction.message, "Sound", i);
          tagName = getFromTagsEmbed(interaction.message, "Tag", i);
          guildTags = interaction.client.bosstalk.guildTags.get(interaction.guildId);
          tagIndex = getTagIndex(interaction, guildTags, tagName, fileName);
          //guildTags may have shifted around since, so let's manually find the one the user selected.


          //Didn't find the tag.
          if(tagIndex == -1){return interaction.reply(new ErrorMessagePayload({errorMessage:`Untagging failed. Try /play [tag] again.`}));}
          
          //guild member isn't an admin AND they didn't write it.
          if(interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator) && (guildTags[tagIndex].author == interaction.member.id)){
            return interaction.reply(new UntagAdminNeededMessagePayload(tagName, fileName, interaction.member.displayName));
          }
          
          //Untag it
          interaction.client.bosstalk.removeGuildTag(interaction.guildId, tagIndex);
          /*
          guildTags.splice(tagIndex, 1);
          await interaction.client.bosstalk.writeGuildTags();
          */
          /*
          await interaction.update(new TaggedSoundsMessagePayload(
            interaction.client.bosstalk.guildTags.get(interaction.guildId).sort(tagSort),
            interaction.client.bosstalk.sounds,
            i,
          ));*/
          await new Promise(resolve => setTimeout(resolve, 500));
          return await interaction.reply(new UntagSuccessMessagePayload(tagName, fileName, guildTags[tagIndex].author));
        
        //This untag request came from a button attached to an UntagAdminNeededMessagePayload
        case UntagAdminNeededMessagePayload.BUTTON.A_UNTAG:

          //If not an admin, return.
          if(!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)){
            return interaction.reply(new ErrorMessagePayload({errorMessage: `Hey wait a minute! You're not an admin :(`}))
          }

          //Grab the tagIndex.
          guildTags = interaction.client.bosstalk.guildTags.get(interaction.guildId);
          [tagName, fileName] = getFromUntagSuccessEmbed(interaction);
          tagIndex = getTagIndex(interaction, guildTags, tagName, fileName);

          //Untag it
          interaction.client.bosstalk.removeGuildTag(interaction.guildId, tagIndex);
          //guildTags.splice(tagIndex, 1);
          //await interaction.client.bosstalk.writeGuildTags();
          /*
          await interaction.update(new TaggedSoundsMessagePayload(
            interaction.client.bosstalk.guildTags.get(interaction.guildId).sort(tagSort),
            interaction.client.bosstalk.sounds,
            i,
          ));
          await new Promise(resolve => setTimeout(resolve, 500));*/
          /*
          let tagsMessage = await interaction.message.fetchReference();
          tagsMessage.edit(new TaggedSoundsMessagePayload(
            interaction.client.bosstalk.guildTags.get(interaction.guildId).sort(tagSort),
            interaction.client.bosstalk.sounds,
            (tagIndex < guildTags.length)? tagIndex : guildTags.length - 1,
          ))*/

          //Change the interaction into an untag success message payload.
          return await interaction.update(new UntagSuccessMessagePayload(tagName, fileName, data.author));

        //Button came from an untag success message payload.
        case UntagSuccessMessagePayload.BUTTON.UNDO_UNTAG:
          [tagName, fileName] = getFromUntagSuccessEmbed(interaction);
          const author = JSON.parse(interaction?.customId).author;
          const creature = getCreatureFromFileName(interaction,fileName);
          const filePath = getFilePathFromFileName(creature.name,fileName);

          interaction.client.bosstalk.setGuildTag(interaction, tagName, filePath, author);
          interaction.message.delete();
    }
  },
  async select(interaction){
    //Grab the value from the user's selection and use it to crawl the sounds of the TaggedSounds embed.
    const fileName = getFromTagsEmbed(interaction.message, "Sound", interaction.values[0] % TaggedSoundsMessagePayload.ITEMS_PER_PAGE);
    const creature = getCreatureFromFileName(interaction,fileName);
    const filePath = getFilePathFromFileName(creature,fileName);
    playFile(interaction, filePath);
    return await interaction.update(new TaggedSoundsMessagePayload(
      interaction.client.bosstalk.guildTags.get(interaction.guildId).sort(tagSort),
      interaction.client.bosstalk.sounds,
      interaction.values[0]))
  },
}

function getTagIndex(interaction, guildTags, tagName, fileName){
  //const creature = getCreatureFromFileName(interaction,fileName);
  //const filePath = getFilePathFromFileName(creature.name,fileName);
  
  return guildTags.findIndex(t => t.tag == tagName && getFileNameFromFilePath(t.filePath) == fileName);
}

/**
 * Assumes that the file name is on the message the interaction came from
 * Also assumes the index hasn't changed ☜(ﾟヮﾟ☜)
 * @param {a} interaction 
 * @param {name} str embed's field name to get
 * @param {i} number embed field's line to get
 * @returns {}
 */
function getFromTagsEmbed(message, name, i){
  if (i){
    return message?.embeds[0].fields.find(f => f.name == name).value.split(`\n`)[i % TaggedSoundsMessagePayload.ITEMS_PER_PAGE].replaceAll('*', '');
  }
  return message?.embeds[0].fields.find(f => f.name == name).value.split(`\n`).find(f => f.includes('**')).replaceAll('*', '');
}

/**
 * This is truly horrendous
 * Magic numbers ╰(*°▽°*)╯
 * @description Searches the embed's first field for "**"" and assumes the first two "**" surround the tagname and the second two "**" surround the fileName.
 * @param {*} interaction 
 */
function getFromUntagSuccessEmbed(interaction){
  //const indices = [...interaction.message.embeds[0].fields[0].value].map((str, i) => str === '**' ? i : -1).filter(index => index !== -1);
  const value = interaction.message.embeds[0].fields[0].value;
  let indices = [];
  let pos = 0;
  while (value.indexOf('**', pos) !== -1){
    indices.push(value.indexOf('**', pos));
    pos = value.indexOf('**', pos) + 1;
  }
  const tagName = interaction.message.embeds[0].fields[0].value.slice(indices[0]+2,indices[1]);
  const fileName = interaction.message.embeds[0].fields[0].value.slice(indices[2]+2,indices[3]);
  return [tagName, fileName];
}

/**
 * @description This function is passed to the bosstalk event emitter as a way to change the tags message whenever the tags change.
 * @param {*} interaction 
 * @param {*} message 
 * @returns 
 */
async function reloadTagsMessage(interaction, message, oldTagIndex){
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