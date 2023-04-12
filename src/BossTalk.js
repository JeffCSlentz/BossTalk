const Discord = require('discord.js');
const fs = require('fs');
const { Stats, statsDataFilePath } = require("./classes/Stats");
const COMMANDS_FOLDER = './src/slash_commands';
const {getFileNameFromFilePath, tagSort} = require('../src/utility');
const data = require('./data'); //not to be confused with the data folder, data is a utility file for reading/writing files.
const Tag = require('./classes/Tag');
const ErrorMessagePayload = require('./message_payloads/ErrorMessagePayload');
const logger = require('./logger.js').logger;
const events = require('events');
const DATA_FOLDER = './data';
const FILES = {
    SOUNDS: `${DATA_FOLDER}/sounds.json`,
    GUILD_TAGS: `${DATA_FOLDER}/guildTags.json`,
    BROWNIE_POINTS: `${DATA_FOLDER}/browniePoints.json`,
    UPDATE_REQUESTS: `${DATA_FOLDER}/updateRequests.json`,
    PICS: `${DATA_FOLDER}/pics.json`,
    PIC_URLS: `${DATA_FOLDER}/picUrls.json`
}

/**
 * This is a meta container for all bosstalk data.
 */
class BossTalk extends events.EventEmitter{
    static EVENTS = {
        GUILD_TAGS_CHANGED: (guildId) => `GUILD_TAGS_CHANGED_${guildId}`
    }
    constructor(){
        super();
        this.loadFiles();
        this.slashCommands = this.loadSlashCommands(COMMANDS_FOLDER);
        this.subCommands = this.loadSubCommands(COMMANDS_FOLDER);
        this.getEventListeners = events.getEventListeners;
        this.interactionData = new Discord.Collection;
        logger.info("BossTalk initialized, data files ready.");
    }

    loadFiles(){
        this.sounds = data.readJSONObject(FILES.SOUNDS);
        this.stats = new Stats(data.readJSONObject(statsDataFilePath));
        this.guildTags = data.readDiscordCollection(FILES.GUILD_TAGS);
        this.browniePoints  = data.readDiscordCollection(FILES.BROWNIE_POINTS);
        this.updateRequests = data.readJSONObject(FILES.UPDATE_REQUESTS);
        this.pics = data.readDiscordCollection(FILES.PICS);
        this.picUrls = data.readDiscordCollection(FILES.PIC_URLS)
    }

    /**
     * 
     * @param {*} guildId 
     * @param {*} tag Watch out, corrupt JSON?
     * @param {*} filePath Must be the full filePath
     * @param {guildMember} author Optional -- Default will assume the interaction creator is the author.
     * @returns message payload
     */
    setGuildTag(interaction,tag,filePath, author){
        if(!this.guildTags.has(interaction.guildId)){
            this.guildTags.set(interaction.guildId, {});
        }
        let tags = this.guildTags.get(interaction.guildId); //Tag[]

        tags.push(new Tag(tag, filePath, author ? author : interaction.member.id));
        tags.sort(tagSort);
    
        //Set and write
        this.emit(BossTalk.EVENTS.GUILD_TAGS_CHANGED(interaction.guildId), 5);
        data.writeDiscordCollection(this.guildTags,FILES.GUILD_TAGS);
    }

    removeGuildTag(guildId, i){
        this.guildTags.get(guildId).splice(i,1);
        this.emit(BossTalk.EVENTS.GUILD_TAGS_CHANGED(guildId),);
        data.writeDiscordCollection(this.guildTags,FILES.GUILD_TAGS);
    }

    loadSlashCommands(commandsFolder){
        const slashCommands = new Discord.Collection();
        const commandFiles = fs.readdirSync(commandsFolder).filter(file => file.endsWith('.js'));
        
        for (const file of commandFiles) {
            const command = require(`.${commandsFolder}/${file}`);
            // Set a new item in the Collection
            // With the key as the command name and the value as the exported module
            slashCommands.set(command.data.name, command);
        }
        logger.info("Loaded Slash Commands")
        return slashCommands;
    }

    loadSubCommands(commandsFolder){
        const subCommands = new Discord.Collection();
        const subCommandFolders = fs.readdirSync(commandsFolder, { withFileTypes: true}).filter(file => file.isDirectory()).map(f => f.name);

        for (const subCommandFolder of subCommandFolders) {
            const subCommandFiles = fs.readdirSync(`${commandsFolder}/${subCommandFolder}`).filter(file => file.endsWith('.js'));
            
            for (const file of subCommandFiles) {
            const subCommand = require(`.${commandsFolder}/${subCommandFolder}/${file}`);
            // Set a new item in the Collection
            // With the key as the command name and the value as the exported module
            subCommands.set(`${subCommandFolder}${subCommand.data.name}`, subCommand);
            }
        }
        logger.info("Loaded Sub Commands")
        return subCommands;
    }
}
module.exports = BossTalk;