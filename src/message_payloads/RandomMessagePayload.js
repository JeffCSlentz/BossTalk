const { getFileNameFromFilePath: fileName } = require("../../src/utility");
const { MessageActionRow, MessageButton, MessageEmbed  } = require('discord.js');

class RandomMessagePayload{
    embeds = [];
    components = [];

    constructor(interaction, sound){
        this.embeds = this.#buildEmbeds(interaction, sound);
        this.components = this.#buildComponents();
    }

    #buildEmbeds(interaction, sound){
        const sounds = interaction.client.bosstalk.sounds.filter(s => s.creatureName == sound.creatureName)
        const embed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle('Playing a random sound')
            .addField('Name', sound.creatureName)
            .setThumbnail('https://flyclipart.com/thumb2/wizards-of-the-coast-and-sign-deal-for-virtual-dampd-tabletop-686225.png')
            // .addFields(
            // 	{ name: 'Regular field title', value: 'Some value here' },
            // 	{ name: '\u200B', value: '\u200B' },
            // 	{ name: 'SoundID', value: sound.id, inline: true },
            // 	{ name: 'Inline field title', value: 'Some value here', inline: true },
            // )
            
            if(interaction.client.bosstalk.picUrls.has(sound.creatureName)){
                const images = interaction.client.bosstalk.picUrls.get(sound.creatureName);
                if(images.length > 0){
                    embed.setImage(images[0].img_url);
                }
            }

            //.setTimestamp()
            embed.setFooter({ text: `This creature has ${sounds.length} sounds.`});
        
            embed.addFields(
            {name: 'Sound', value: fileName(sound.filePath), inline: true})
        
        
        if(sound.location.expansion != "" && sound.location.zone != ""){
            embed.addFields(
            {name: '\u200B', value: '\u200B'},
            {name: 'Expansion', value: sound.location.expansion, inline: true},
            {name: 'Location', value: sound.location.zone, inline: true})
        }
        if(sound.text != ""){
            embed.addField('Text', sound.text)
        }
        else{
            embed.addField('Text', `¯\\\_(ツ)_/¯`)
        }
        return [embed];
    }

    #buildComponents() {
        const row = new MessageActionRow()
        .addComponents(
            [
            new MessageButton()
            .setCustomId(JSON.stringify({button: 'play', command:'play', subcommand: 'random'})) 
            .setLabel('Play')                                                         
            .setStyle('PRIMARY'),
  
            new MessageButton()
            .setCustomId(JSON.stringify({button: 'reroll', command: 'play', subcommand: 'random'}))
            .setLabel('Reroll')
            .setStyle('PRIMARY'),

            new MessageButton()
            .setCustomId(JSON.stringify({button: 'creatureR', command: 'play', subcommand: 'creature'}))
            .setLabel('Show Creature')
            .setStyle('SECONDARY')
            ],
            
        );
        return [row];
    }
}

module.exports = RandomMessagePayload;