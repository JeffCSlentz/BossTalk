const { getFileNameFromFilePath: fileName } = require('../utility.js')
const { MessageActionRow, MessageAttachment, MessageButton, MessageEmbed, MessageSelectMenu } = require('discord.js');

class CreatureMessagePayload{
    static ITEMS_PER_PAGE = 15;
    #interaction;
    #creature = {};
    #curSoundIndex = 0;
    #pagesNeeded = false;
    #curPage = 0;
    #lastPage = 0;
    embeds = [];
    components = [];
    /**
     * 
     * @param {Creature} creature 
     * @param {number} curSoundIndex 
     */
    constructor(interaction, creature, curSoundIndex=0) {
        this.#interaction = interaction;
        this.#creature = creature;
        this.#curSoundIndex = parseInt(curSoundIndex);
        this.#pagesNeeded = creature.sounds.length > CreatureMessagePayload.ITEMS_PER_PAGE ? true : false;
        this.#curPage = Math.floor((this.#curSoundIndex) / CreatureMessagePayload.ITEMS_PER_PAGE); //0 indexed
        this.#lastPage = Math.floor(this.#creature.sounds.length / CreatureMessagePayload.ITEMS_PER_PAGE); //0 indexed
        //this.files = this.#buildFiles();
        this.embeds = this.#buildEmbeds();
        this.components = this.#buildComponents();
    }

    #buildEmbeds(){
        const creatureEmbed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle(`${this.#creature.name}`)
            //.addField('Name', this.#creature.name)
            //.attachFiles(this.pic)
            //.setThumbnail(`attachment://${this.#creature.name}.png`)

        // if(this.files){
        //     //creatureEmbed.attachFiles(this.pic);
        //     creatureEmbed.setImage(`attachment://${this.#creature.name}.png`)
        // }

        if(this.#interaction.client.bosstalk.picUrls.has(this.#creature.name)){
            const images = this.#interaction.client.bosstalk.picUrls.get(this.#creature.name);
            if(images.length > 0){
                creatureEmbed.setImage(images[0].img_url);
            }
        }

        let fileNames = this.#creature.sounds.map(s => fileName(s.filePath));
        /*
        let locations = this.#creature.sounds.map(s => {
            if(!s.location.expansion && !s.location.zone){
                return `\u200B`;
            }
            else{
                return `${s.location.expansion}, ${s.location.zone}`;
            }
        });
        */
        const sound = this.#creature.sounds[this.#curSoundIndex]
        fileNames[this.#curSoundIndex] = `**${fileNames[this.#curSoundIndex]}**`
        let expansion = sound.location.expansion;
        let zone = sound.location.zone;
        let text = sound.text;
        expansion = expansion != '' ? expansion : `Unknown`;
        zone = zone != '' ? zone : `Unknown`;
        text = text != '' ? text : `¯\\\_(ツ)_/¯`
        //[fileNames, locations].forEach(arr => arr[this.#curSoundIndex] = `**${arr[this.#curSoundIndex]}**`);

        //Get the right slice of results, expand size, and add a footer.
        if(this.#pagesNeeded){
            let start = (this.#curPage)*CreatureMessagePayload.ITEMS_PER_PAGE;
            let end = (this.#curPage+1)*CreatureMessagePayload.ITEMS_PER_PAGE;
            fileNames = fileNames.slice(start,end);
            //locations = locations.slice(start,end);

            if(this.#curPage == this.#lastPage){
                fileNames.push(...Array(CreatureMessagePayload.ITEMS_PER_PAGE - arr.length).fill(`\u200B`));
                //[fileNames,locations].forEach(arr => arr.push(...Array(CreatureMessagePayload.ITEMS_PER_PAGE - arr.length).fill(`\u200B`)))
            }

            creatureEmbed.setFooter({text: `Page ${this.#curPage + 1} of ${this.#lastPage + 1}`});
        }
        

        creatureEmbed.addFields(
            {name: `Expansion`, value: expansion, inline: true},
            {name: `Zone`, value: zone, inline: true},
            {name: `Text`, value: text, inline: false},
            {name: 'Sounds', value: fileNames.join("\n")},
        );

        return [creatureEmbed];
    }

    #buildComponents(){
        return [ this.#buildSelect(), this.#buildButtons()]
    }

    #buildSelect(){
        //ids starts counting from 1
        const options = this.#creature.sounds.map((s, i) => ({
            label: `${fileName(s.filePath)}`,
            //description: fileName(s.filePath),
            value: (i).toString(),
            default: (i == this.#curSoundIndex) ? true : false
        })).slice(this.#curPage * CreatureMessagePayload.ITEMS_PER_PAGE, (this.#curPage + 1) * CreatureMessagePayload.ITEMS_PER_PAGE)

        const row = new MessageActionRow()
        .addComponents(
            new MessageSelectMenu()
                .setCustomId(JSON.stringify({
                    command: 'play',
                    subcommand: 'creature',
                }))
                .setPlaceholder('Pick a sound')
                .addOptions(options)
        );
        return row
    }

    #buildButtons(){

        //#region Button Definitions
        const backButton = new MessageButton()
            .setCustomId(JSON.stringify({
                    button: 'flip', 
                    command: 'play', 
                    subcommand: 'creature', 
                    page: (this.#curPage - 1),
                    soundIndex: ((this.#curPage - 1) * CreatureMessagePayload.ITEMS_PER_PAGE)
                }))
            .setLabel('<--')
            .setStyle('SECONDARY')
            
        const nextButton = new MessageButton()
            .setCustomId(JSON.stringify({
                    button: 'flip',
                    command: 'play', 
                    subcommand: 'creature',
                    page: (this.#curPage + 1),
                    soundIndex: ((this.#curPage + 1) * CreatureMessagePayload.ITEMS_PER_PAGE)
                }))
            .setLabel('-->')
            .setStyle('SECONDARY')

        const playButton = new MessageButton()
            .setCustomId(JSON.stringify({
                    button: 'play', 
                    command: 'play', 
                    subcommand: 'creature', 
                    page: this.#curPage,
                    soundIndex: this.#curSoundIndex
                }))
            .setLabel('Play')
            .setStyle('PRIMARY')


        const tagButton = new MessageButton()
            .setCustomId(JSON.stringify({
                    button: 'tag',
                    command: 'play', 
                    subcommand: 'creature',
                    page: (this.#curPage + 1),
                    soundIndex: this.#curSoundIndex
                }))
            .setLabel('Tag')
            .setStyle('SECONDARY')
        //#endregion
        
        const row = new MessageActionRow()
        
        if(this.#pagesNeeded){
            row.addComponents([
                backButton,
                playButton,
                nextButton,
                tagButton,
            ]);

                //page is indexed at 0
            if(this.#curPage == 0) row.components[0].setDisabled(true);//disable back
            if(this.#curPage == this.#lastPage) row.components[2].setDisabled(true)//disable next
        }
        else{
            row.addComponents([
                playButton,
                tagButton]);
        }
        return row;
    }

    #buildFiles(){
        if(!this.#interaction.client.bosstalk.pics.has(this.#creature.name)) return null;

        const base64_img = this.#interaction.client.bosstalk.pics.get(this.#creature.name)[0].img_uri;
        const sfbuff = new Buffer.from(base64_img.split(",")[1], "base64");
        return [new MessageAttachment(sfbuff, `${this.#creature.name}.png`)];
    }
}
module.exports = CreatureMessagePayload;