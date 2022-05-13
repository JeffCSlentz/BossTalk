const { writeJSONObject } = require("../data");
const statsDataFilePath = './data/statsData.json';
const logger = require('../logger.js').logger;

/**
 * Large container for all the tracked stats.
 */
class Stats {
    constructor(obj) {
        this.soundsAvailable = new Stat("Sounds Indexed", 0);
        this.soundsPlayed = new Stat("Sounds Played", 0);
        this.guilds = new Stat("Servers", 0);
        this.users = new Stat("Users", 0);
        this.commands = new Stat("Commands ran", 0);
        this.uniqueUsersArray = [];
        this.uniqueUsers = new Set();

        //This is a mega-yikes
        if (obj) {
            Object.setPrototypeOf(this, Stats.prototype);
            Object.assign(this, obj);

            let stats = ["soundsAvailable", "soundsPlayed", "guilds", "users", "commands"];
            for (let stat of stats) {
                Object.setPrototypeOf(this[stat], Stat.prototype);
            }

        }
        this.updateUniqueUsers();
    }

    getStatsMessage() {
        return [`I have **${this.soundsAvailable.num}** sounds.`,
        `I've played **${this.soundsPlayed.num}** sounds.`,
        `I'm in **${this.guilds.num}** servers.`,
        `I've served **${this.commands.num}** commands to **${this.users.num}** unique users.`];
    }
    playedSound(message, soundFilePath) {
        this.soundsPlayed.update(1, [Date.now(), soundFilePath, message.member.id, message.member.user.username]);
        writeJSONObject(this, statsDataFilePath);
    }
    addGuild(guild) {
        this.guilds.update(1, [Date.now(), guild.id, guild.name, 1]);
        logger.info(`Added ${guild.id}:${guild.name}`);
        writeJSONObject(this, statsDataFilePath);
    }
    removeGuild(guild) {
        this.guilds.update(-1, [Date.now(), guild.id, guild.name, -1]);
        logger.info(`Removed ${guild.id}:${guild.name}`);
        writeJSONObject(this, statsDataFilePath);
    }
    addCommand(author, command) {
        this.commands.update(1, [Date.now(), author.id, author.username, command.name]);

        if (!this.uniqueUsers.has(author.id)) {
            this.uniqueUsersArray.push(author.id);
            this.uniqueUsers.add(author.id);
            this.users.update(1, [Date.now(), author.id, author.username]);
            logger.info(`Added user ${author.id}:${author.username}`);
        }
        writeJSONObject(this, statsDataFilePath);
    }
    updateUniqueUsers() {
        this.uniqueUsers = new Set(this.uniqueUsersArray);
        return this;
    }
}


/**
 * Holds an individual stat. 
 * @class
 * @classdesc Not sure the best way to handle this one.
 */
 class Stat {
    constructor(name, n, str){
        this.name = name;
        this.num = n;
    }
    update(n, event){
        this.num = this.num + n;
        if(!this.events) this.events = [];
        this.events.push(event);
    }
}

module.exports = {Stats, Stat, statsDataFilePath};
