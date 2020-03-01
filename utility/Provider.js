const Discord = require('discord.js');
const fs = require('fs');
const guildDataFilePath = './data/guildData.json'
const logger = require('./logger.js').logger;

class Provider{
    constructor(){
        this.guildData = readDiscordCollection(guildDataFilePath)
    }

    getGuildProperty(guild, prop){
        if (guild && this.guildData.has(guild.id) && this.guildData.get(guild.id)[prop]){
            return this.guildData.get(guild.id)[prop];
        }
        return (new GuildData())[prop];
    }
    setGuildProperty(guild, prop, val){
        if(!guild){
            throw("Tried to set a guild property without a guild.")
        }
        if(!this.guildData.has(guild.id)){
            this.guildData.set(guild.id, new GuildData());
        }
        this.guildData.get(guild.id)[prop] = val;
        writeDiscordCollection(this.guildData, guildDataFilePath)
    }
}

module.exports = Provider;

class GuildData {
    constructor(){
        this.prefix = "!",
        this.volume = 0.4
    }
}

function writeDiscordCollection(collection, filePath){
    fs.writeFile(filePath, JSON.stringify([...collection]), (err) => {
      if (err) throw err;
      logger.info(`Wrote to ${filePath}!`);
    });
}

function readDiscordCollection(filePath){
    if(fs.existsSync(filePath)){
        try {
            result = new Discord.Collection(JSON.parse(fs.readFileSync(filePath)));
            logger.info(`Loaded ${filePath}`);
            return result;
        }
        catch(error) {
            logger.error(error)
            logger.error(`Something went wrong loading ${filePath}. Is it corrupted? Returning empty Discord Collection.`);
            return new Discord.Collection();
        }
    }
    else{
        logger.info(`${filePath} not found. Returning empty Discord Collection.`)
        return new Discord.Collection();
    }
}