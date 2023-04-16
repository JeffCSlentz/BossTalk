const { getFileNameFromFilePath, attachSoundstoTags } = require('../utility.js')
const { ActionRowBuilder, ButtonBuilder, EmbedBuilder, StringSelectMenuBuilder, ButtonStyle } = require('discord.js');
const ITEMS_PER_EMBED = 240;
const COLUMNS = 3;
class AllTagsMessagePayload{
    #tags = [];
    #embedsNeeded = 1;
    embeds = [];
    components = [];
    
    constructor(tags, sounds) {
        this.#tags = attachSoundstoTags(tags, sounds);
        this.#embedsNeeded = Math.ceil(this.#tags.length / ITEMS_PER_EMBED);
        this.embeds = this.#buildEmbeds();
        this.fetchReply = true;
    }    
    #buildEmbeds(){
        if(this.#tags.length == 0){
            return noTags();
        }
        let tagNames = this.#tags.map(t => (t.length > 15) ? t.tag.slice(0,15) + '...' : t.tag);
        tagNames = [...new Set(tagNames)];
        let embeds = [];
        for(let i = 0; i < this.#embedsNeeded; i++){
            let tagIndex = i * ITEMS_PER_EMBED
            const tagsEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Tags' + (this.#embedsNeeded > 1 ?  ', Page ' +  (i + 1):''));

            let fields = [];
            for(let j = 0; j < COLUMNS; j++){
                if(tagIndex + (ITEMS_PER_EMBED / COLUMNS) * j > tagNames.length) break;
                fields.push({
                    name: '\u200B',
                    value: tagNames.slice(tagIndex + (ITEMS_PER_EMBED / COLUMNS) * j, tagIndex + (ITEMS_PER_EMBED / COLUMNS) * (j + 1)).join(`\n`), inline:true
                })
            }

            // tagsEmbed.addFields(
            //     {name: '\u200B', value: tagNames.slice(tagIndex, tagIndex + (ITEMS_PER_EMBED / COLUMNS)).join(`\n`), inline:true},
            //     {name: '\u200B', value: tagNames.slice(tagIndex + (ITEMS_PER_EMBED / COLUMNS), tagIndex + (ITEMS_PER_EMBED / COLUMNS) * 2).join(`\n`), inline:true},
            //     {name: '\u200B', value: tagNames.slice(tagIndex + (ITEMS_PER_EMBED / COLUMNS) * 2, tagIndex + (ITEMS_PER_EMBED / COLUMNS) * 3).join(`\n`), inline:true},
            // )
            tagsEmbed.addFields(fields);
            embeds.push(tagsEmbed);
        }

        return embeds;
    }
}
  
function noTags(){
    return [
        new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`＞﹏＜ No tags left!`)
            .addFields([
                { name: 'ᓚᘏᗢ', value: `Here's a cat instead`}
            ])
    ];
}
module.exports = AllTagsMessagePayload;