const { getFileNameFromFilePath: fileName } = require("../../src/utility");
const { ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle  } = require('discord.js');

class RandomMessagePayload{
    embeds = [];
    components = [];

    constructor(interaction, sound){
        this.embeds = this.#buildEmbeds(interaction, sound);
        this.components = this.#buildComponents();
    }

    #buildEmbeds(interaction, sound){
        const sounds = interaction.client.bosstalk.sounds.filter(s => s.creatureName == sound.creatureName)
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Playing a random sound')
            .addFields([
                { name: 'Name', value: sound.creatureName}
            ])
            .setThumbnail('https://flyclipart.com/thumb2/wizards-of-the-coast-and-sign-deal-for-virtual-dampd-tabletop-686225.png')
            
            if(interaction.client.bosstalk.picUrls.has(sound.creatureName)){
                const images = interaction.client.bosstalk.picUrls.get(sound.creatureName);
                if(images.length > 0){
                    embed.setImage(images[0].img_url);
                }
            }

            embed.setFooter({ text: `This creature has ${sounds.length} sounds.`});
        
            embed.addFields(
            {name: 'Sound', value: fileName(sound.filePath), inline: true})
        
        
        if(sound.location.expansion != "" && sound.location.zone != ""){
            embed.addFields(
            {name: '\u200B', value: '\u200B'},
            {name: 'Expansion', value: sound.location.expansion, inline: true},
            {name: 'Location', value: sound.location.zone, inline: true})
        }

        embed.addFields([
            {name: 'Text', value: (sound.text === "")? `¯\\\_(ツ)_/¯` :  sound.text}
        ])

        return [embed];
    }

    #buildComponents() {
        const row = new ActionRowBuilder()
        .addComponents(
            [
            new ButtonBuilder()
            .setCustomId(JSON.stringify({button: 'play', command:'play', subcommand: 'random'})) 
            .setLabel('Play')                                                         
            .setStyle(ButtonStyle.Primary),
  
            new ButtonBuilder()
            .setCustomId(JSON.stringify({button: 'reroll', command: 'play', subcommand: 'random'}))
            .setLabel('Reroll')
            .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
            .setCustomId(JSON.stringify({button: 'creatureR', command: 'play', subcommand: 'creature'}))
            .setLabel('Show Creature')
            .setStyle(ButtonStyle.Secondary)
            ],
            
        );
        return [row];
    }
}

module.exports = RandomMessagePayload;