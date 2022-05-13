const { getFileNameFromFilePath: fileName, attachSoundstoTags } = require('../utility.js')
const { MessageActionRow, MessageButton, MessageEmbed, MessageSelectMenu } = require('discord.js');

class TaggedSoundsMessagePayload{
    static ITEMS_PER_PAGE = 15;
    #tags = [];
    #curTagIndex = 0;
    #pagesNeeded = false;
    #curPage = 0;
    #lastPage = 0;
    embeds = [];
    components = [];
    static BUTTON = {
        FLIP: "FLIP",
        PLAY: "PLAY",
        CREATURE_T: "CREATURE_T",
        TRY_UNTAG: "TRY_UNTAG"
    }

    constructor(tags, sounds, curTagIndex=0) {
        this.#tags = attachSoundstoTags(tags, sounds);
        this.#curTagIndex = parseInt(curTagIndex);
        this.#pagesNeeded = tags.length > TaggedSoundsMessagePayload.ITEMS_PER_PAGE ? true : false;
        this.#curPage = Math.floor((this.#curTagIndex) / TaggedSoundsMessagePayload.ITEMS_PER_PAGE); //0 indexed
        this.#lastPage = Math.floor(this.#tags.length / TaggedSoundsMessagePayload.ITEMS_PER_PAGE); //0 indexed
        this.embeds = this.#buildEmbeds();
        this.components = this.#buildComponents();
        this.fetchReply = true;
    }

    #buildEmbeds(){

        if(this.#tags.length == 0){
            return [new MessageEmbed()
            .setColor('#0099ff')
            .setTitle(`＞﹏＜ No tags left!`)
            .addField('ᓚᘏᗢ', `Here's a cat instead`)];
        } 

        const tagsEmbed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle('Tags')
            .setThumbnail('https://i.imgur.com/AfFp7pu.png');


        let tagNames = this.#tags.map(t => t.tag);
        let fileNames = this.#tags.map(t => fileName(t.sound.filePath));

        [tagNames, fileNames].forEach(arr => arr[this.#curTagIndex] = `**${arr[this.#curTagIndex]}**`);

        //Get the right slice of results, expand size, and add a footer.
        if(this.#pagesNeeded){
            let start = (this.#curPage)*TaggedSoundsMessagePayload.ITEMS_PER_PAGE;
            let end = (this.#curPage+1)*TaggedSoundsMessagePayload.ITEMS_PER_PAGE;
            tagNames = tagNames.slice(start,end);
            fileNames = fileNames.slice(start,end);

            if(this.#curPage == this.#lastPage){
                [tagNames,fileNames].forEach(arr => arr.push(...Array(TaggedSoundsMessagePayload.ITEMS_PER_PAGE - arr.length).fill(`\u200B`)))
            }

            tagsEmbed.setFooter({text: `Page ${this.#curPage + 1} of ${this.#lastPage + 1}`});
        }
        


        tagsEmbed.addFields(
            {name: 'Tag', value: tagNames.join("\n"), inline: true},
            {name: 'Sound', value: fileNames.join("\n"), inline: true})

        return [tagsEmbed];
    }

    #buildComponents(){
        return (this.#tags.length == 0) ? [] : [ this.#buildSelect(), this.#buildButtons()]
    }

    #buildSelect(){
        if(this.#tags.length == 0) return [];
        //ids starts counting from 1
        const options = this.#tags.map((t, i) => ({
            label: `${t.tag}`,
            description: fileName(t.filePath),
            value: (i).toString(),
            default: (i == this.#curTagIndex) ? true : false
        })).slice(this.#curPage * TaggedSoundsMessagePayload.ITEMS_PER_PAGE, (this.#curPage + 1) * TaggedSoundsMessagePayload.ITEMS_PER_PAGE)

        const row = new MessageActionRow()
        .addComponents(
            new MessageSelectMenu()
                .setCustomId(JSON.stringify({
                    command: 'play',
                    subcommand: 'tag',
                    //page: this.#curPage
                }))
                .setPlaceholder('Pick a tag')
                .addOptions(options)
        );
        return row
    }

    #buildButtons(){

        //#region Button Definitions
        const backButton = new MessageButton()
            .setCustomId(JSON.stringify({
                button: TaggedSoundsMessagePayload.BUTTON.FLIP,
                command: 'play', 
                subcommand: 'tag', 
                page: (this.#curPage - 1),
                tagIndex: ((this.#curPage - 1) * TaggedSoundsMessagePayload.ITEMS_PER_PAGE)
            }))
            .setLabel('<--')
            .setStyle('SECONDARY')
            
        const nextButton = new MessageButton()
            .setCustomId(JSON.stringify({
                button: TaggedSoundsMessagePayload.BUTTON.FLIP,
                command: 'play', 
                subcommand: 'tag',
                page: (this.#curPage + 1),
                tagIndex: ((this.#curPage + 1) * TaggedSoundsMessagePayload.ITEMS_PER_PAGE)
            }))
            .setLabel('-->')
            .setStyle('SECONDARY')

        const playButton = new MessageButton()
            .setCustomId(JSON.stringify({
                button: TaggedSoundsMessagePayload.BUTTON.PLAY, 
                command: 'play', 
                subcommand: 'tag', 
                page: this.#curPage,
                tagIndex: this.#curTagIndex
            }))
            .setLabel('Play')
            .setStyle('PRIMARY')

        const creatureButton = new MessageButton()
            .setCustomId(JSON.stringify({
                button: TaggedSoundsMessagePayload.BUTTON.CREATURE_T, 
                command: 'play', 
                subcommand: 'creature', 
                index: (this.#curTagIndex - (this.#curPage*TaggedSoundsMessagePayload.ITEMS_PER_PAGE))
            }))
            .setLabel('Show Creature')
            .setStyle('SECONDARY')
            
        const tagButton = new MessageButton()
            .setCustomId(JSON.stringify({
                button: TaggedSoundsMessagePayload.BUTTON.TRY_UNTAG,
                command: 'play', 
                subcommand: 'tag',
                page: (this.#curPage + 1),
                tagIndex: this.#curTagIndex
            }))
            .setLabel('Untag')
            .setStyle('SECONDARY')
        //#endregion
        
        const row = new MessageActionRow()
        
        if(this.#pagesNeeded){
            row.addComponents([
                backButton,
                playButton,
                nextButton,
                creatureButton,
                tagButton,
            ]);

                //page is indexed at 0
            if(this.#curPage == 0) row.components[0].setDisabled(true);//disable back
            if(this.#curPage == this.#lastPage) row.components[2].setDisabled(true)//disable next
        }
        else{
            row.addComponents([
                playButton,
                creatureButton,
                tagButton]);
        }
        return row;
    }
}
  
module.exports = TaggedSoundsMessagePayload;