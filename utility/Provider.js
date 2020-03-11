const Discord = require('discord.js');
const fs = require('fs');
const guildDataFilePath = './data/guildData.json'
const statsDataFilePath = './data/statsData.json'
const logger = require('./logger.js').logger;

class Provider{
    constructor(){
        this.guildData = readDiscordCollection(guildDataFilePath);
        this.stats = new Stats(readJSONObject(statsDataFilePath));
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

class Stats{
    constructor(obj){
        this.soundsAvailable = new Stat("Sounds Indexed", 0);
        this.soundsPlayed = new Stat("Sounds Played", 0);
        this.guilds = new Stat("Servers", 0);  
        this.users = new Stat("Users", 0);
        this.commands = new Stat("Commands ran", 0)
        this.uniqueUsersArray = [];
        this.uniqueUsers = new Set();

        //This is a mega-yikes
        if (obj){
            Object.setPrototypeOf(this, Stats.prototype)
            Object.assign(this, obj)
            
            let stats = ["soundsAvailable","soundsPlayed","guilds","users","commands"]
            for(let stat of stats){
                Object.setPrototypeOf(this[stat], Stat.prototype)
            }
            
        }
        this.updateUniqueUsers();
    }

    getStatsMessage(){
        return [`I have **${this.soundsAvailable.num}** sounds.`,
                `I've played **${this.soundsPlayed.num}** sounds.`,
                `I'm in **${this.guilds.num}** servers.`,
                `I've served **${this.commands.num}** commands to **${this.users.num}** unique users.`];
    }
    updateNumberOfSounds(message){
        this.soundsAvailable.num = message.client.numSounds;
    }
    playedSound(message, soundFilePath){
        this.soundsPlayed.update(1, [Date.now(), soundFilePath, message.author.id, message.author.username])
        writeJSONObject(this, statsDataFilePath);
    }
    addGuild(guild){
        this.guilds.update(1, [Date.now(), guild.id, guild.name, 1])
        logger.info(`Added ${guild.id}:${guild.name}`);
        writeJSONObject(this, statsDataFilePath);
    }
    removeGuild(guild){
        this.guilds.update(-1, [Date.now(), guild.id, guild.name, -1])
        logger.info(`Removed ${guild.id}:${guild.name}`);
        writeJSONObject(this, statsDataFilePath);
    }
    addCommand(author, command){
        this.commands.update(1, [Date.now(), author.id, author.username,command.name])

        if(!this.uniqueUsers.has(author.id)){
            this.uniqueUsersArray.push(author.id)
            this.uniqueUsers.add(author.id)
            this.users.update(1, [Date.now(), author.id, author.username])
            logger.info(`Added user ${author.id}:${author.username}`);
        }
        writeJSONObject(this, statsDataFilePath);
    }
    updateUniqueUsers(){
        this.uniqueUsers = new Set(this.uniqueUsersArray);
        return this;
    }
}

class Stat {
    constructor(name, n, str){
        this.name = name;
        this.num = n;
        this.events = [];
    }
    update(n, event){
        this.num = this.num + n;
        this.events.push(event);
    }
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
function writeDiscordCollection(collection, filePath){
    fs.writeFile(filePath, JSON.stringify([...collection]), (err) => {
      if (err) throw err;
    });
    logger.info(`Wrote to ${filePath}!`);
}
function readJSONObject(filePath){
    if(fs.existsSync(filePath)){
        try {
            result = JSON.parse(fs.readFileSync(filePath));
            logger.info(`Loaded ${filePath}`);
            return result;
        }
        catch(error) {
            logger.error(error)
            logger.error(`Something went wrong loading ${filePath}. Is it corrupted? Returning fallback object.`);
            return;
        }
    }
    else{
        logger.info(`${filePath} not found. Returning fallback object.`)
        return;
    }
}
function writeJSONObject(obj, filePath){
    fs.writeFile(filePath, JSON.stringify(obj), (err) => {
        if (err) throw err;
    });
    //logger.info(`Wrote to ${filePath}!`);
}