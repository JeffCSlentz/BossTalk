//Creates the creature card and allows you to play files from it, browse sounds, etc.
const { playCreature, getSoundsFromCreatureName, getFilePathFromFileName, getFileNameFromFilePath, getCreatureFromFileName, time } = require('../../utility.js');
const { getVoiceConnection, VoiceConnectionStatus } = require('@discordjs/voice');
const CreatureMessagePayload = require('../../message_payloads/CreatureMessagePayload.js');
const JoinChannelMessagePayload = require('../../message_payloads/JoinChannelMessagePayload');
const Fuse = require('fuse.js');
const tag = require('./tag.js');
const {Modal, TextInput} = require('discordjs-modal');
const SetTagModal = require('../../modals/SetTagModal');
const Creature = require('../../classes/Creature');
const TaggedSoundsMessagePayload = require('../../message_payloads/TaggedSoundsMessagePayload.js');
const ErrorMessagePayload = require('../../message_payloads/ErrorMessagePayload.js');
const { MessageEmbed } = require('discord.js');

module.exports = {
    data: {name: "creature"},
	async execute(interaction) {
        const creature = tryMakeCreature(interaction);
        if(creature.sounds.length == 0){
          return await interaction.reply("**error**: creature not found")
        }
        await playCreature(interaction, {sounds:creature.sounds})
        return await interaction.reply(new CreatureMessagePayload(interaction, creature,0));
    },
    async autocomplete(interaction){
        //Retrieve creatures and user input.
        const input = interaction.options.data[0].options[0].value
        const creatureNames = time(makeCreatureNamesArr, 'Make creature Names Array')(interaction);
        if(input){
            const matchingCreatures = time(search, 'search creature names')(creatureNames, input);
            return await interaction.respond(matchingCreatures);
        }
        else{
            return await interaction.respond(creatureNames.slice(0,20).map(i => ({name:i,value:i})))
        }
    },
    async button(interaction){
        const data = JSON.parse(interaction.customId)
        let creature = tryMakeCreature(interaction);
        let soundIndex = 0;
        let fileName = '';
        switch (data.button){
            case "flip":
                return await interaction.update(new CreatureMessagePayload(interaction, creature, data.soundIndex));
            case "play":
                const voiceConnection = getVoiceConnection(interaction.guildId)
                if(!voiceConnection || voiceConnection.state?.status === VoiceConnectionStatus.Disconnected){
                    return await interaction.reply(new JoinChannelMessagePayload(interaction));
                }
                else{
                    playCreature(interaction, creature,  data.soundIndex)
                    return await interaction.deferUpdate();
                }
                
            //Annoyingly, these two rely on how the embed information is stored :(
            case "creatureR":   //Button click came from the creature button on a RandomMessagePayload
                fileName = interaction.message?.embeds[0].fields.find(f => f.name == "Sound").value;
                soundIndex = creature.sounds.findIndex(s => s.filePath == getFilePathFromFileName(creature.name,fileName))
                return await interaction.reply(new CreatureMessagePayload(interaction, creature, soundIndex));
            case TaggedSoundsMessagePayload.BUTTON.CREATURE_T:   //Button click came from the creature button on a TaggedSoundsMessagePayload
                let index = data.index;
                fileName = interaction.message?.embeds[0].fields.find(f => f.name == "Sound").value.split(`\n`)[index];
                creature = getCreatureFromFileName(interaction, fileName);
                soundIndex = creature.sounds.findIndex(s => s.filePath == getFilePathFromFileName(creature.name,fileName));
                return await interaction.reply(new CreatureMessagePayload(interaction, creature, soundIndex));
            case "tag":
                
                return await interaction.client.modal.send(interaction, new SetTagModal('play', 'creature', creature.sounds[data.soundIndex].filePath));
                //return await interaction.client.modal.send(interaction, makeModal(creature, data.soundIndex));
        }
    },
    async select(interaction){
        const creature = tryMakeCreature(interaction);
        playCreature(interaction, creature, interaction.values[0]);
        //const newEmbed = new MessageEmbed(interaction.message.embeds[0]).setDescription('change!')
        //return await interaction.update({embeds: [newEmbed]})
        return await interaction.update(new CreatureMessagePayload(interaction, creature,interaction.values[0]))
    },
    async modal(interaction){
        const tagName = interaction.fields[0].value;    //user input
        const filePath = interaction.fields[0].custom_id;

        if(tagName.includes('*')){
            return new ErrorMessagePayload({errorMessage:`Sorry, i'm too dumb to handle asterisks`});
        }

        if(!interaction.client.bosstalk.guildTags.has(interaction.guildId)){
            interaction.client.bosstalk.guildTags.set(interaction.guildId, {});
        }
        let tags = interaction.client.bosstalk.guildTags.get(interaction.guildId); //Tag[]


        if(tags.filter(t => t.tag == tagName && t.filePath == filePath).length > 0){
            return new ErrorMessagePayload({errorMessage:`Tag **${tagName}** already exists for sound **${getFileNameFromFilePath(filePath)}**`});
        }

        interaction.client.bosstalk.setGuildTag(interaction, tagName, filePath);
        return await interaction.reply(`༼ つ ◕_◕ ༽つ Tag **${tagName}** created for sound **${getFileNameFromFilePath(filePath)}**`);
    }
}

function tryMakeCreature(interaction){
    const creatureName = interaction.options?.data[0].options[0].value || interaction.message?.embeds[0].fields.find(f => f.name == "Name")?.value || interaction.message?.embeds[0].title  ;
    if(!creatureName) throw logger.error(`creatureName not found on the embed!`);

    const sounds = getSoundsFromCreatureName(interaction, creatureName);
    return new Creature(creatureName, sounds);

}
function search(creatureNames, input){
    return new Fuse(creatureNames).search(input).slice(0,20).map(i => ({name:i.item,value:i.item}))
}
function makeCreatureNamesArr(interaction){
    return [... new Set(interaction.client.bosstalk.sounds.map(s => s.creatureName))]
}