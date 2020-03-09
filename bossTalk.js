//#region Variables
//Discord
const fs = require('fs');
const {token, authorID} = require('./config.json');
const Discord = require('discord.js');
const client = new Discord.Client();
const Provider = require('./utility/Provider.js');

//First-Party
const data = require('./utility/dataManipulation.js')
const utility = require('./utility/utility.js')
const validate = require('./utility/validator.js').validate;

//Third-Party
const logger = require('./utility/logger.js').logger;

//Persistent Data
client.provider = new Provider();
client.guildTags = new Discord.Collection();
client.commands = new Discord.Collection();
client.creatureSounds = new Discord.Collection(); //key = creatureName, value = sounds[]
client.allSounds = new Discord.Collection();      //key = soundID,      value = sound
client.categorySounds = new Discord.Collection();
client.filePathSounds = new Discord.Collection();
client.browniePoints = new Discord.Collection();  //key = userID,        value = numBrowniePoints
client.guildData = new Discord.Collection();
client.numSounds = 0;
client.updates = [];
client.messageReceivedTime = 0;
client.authorID = authorID 

//constants
const dataFolder = './data';
const commandsFolder = './commands';
const creaturesFolder = './sounds/creature';
const creatureFiles = fs.readdirSync(creaturesFolder);
//#endregion

function initialize(){
  data.loadCommands(client, commandsFolder);
  data.loadFiles(client, dataFolder, ["creatureSounds", "guildTags", "browniePoints"])
  data.checkForNewCreatures(client, creatureFiles);
}

initialize();
client.login(token);

//#region Client event handlers
client.on('ready', () => {
  logger.info('Ready!')
});

client.on('message', message => {
  //If bosstalk is mentioned.
  if(message.mentions.members && message.mentions.members.has(client.user.id)){
    return message.channel.send(`Hi, I'm boss-talk! Try **${message.client.provider.getGuildProperty(message.guild, "prefix")}help**`)
  }

  //If message doesn't start with prefix or it's a bot.
  if (!message.content.startsWith(message.client.provider.getGuildProperty(message.guild, "prefix")) || message.author.bot) return;

  //Housekeeping
  client.messageReceivedTime = new Date(Date.now()); 
  logger.info(`${message.guild.name}-${message.author.username}: "${message.content}"`);

  params = utility.getParamsFromMessage(message);
  command = params.command;
  args = params.args;

  try {
    validation = validate(message, args, command);
    if(validation.isValid){
      message.client.provider.stats.addCommand(message.author, command)
      command.execute(message, args)
    }
    else if(validation.suggestion){
      message.reply(validation.suggestion)
    }
    else{
      return;
    }
  }
  catch (error) {
      console.error(error);
      message.reply('There was an error trying to execute that command!');
  }
});

client.on('guildCreate', guild => {
  client.provider.stats.addGuild(guild);
});

client.on('guildDelete', guild => {
  client.provider.stats.removeGuild(guild);
});

client.on('error', console.error);
//#endregion

//#region Interrupt handler
process.on('SIGINT', function() {
  logger.info("Caught interrupt signal");

  for(const connection of client.voice.connections.values()){
    connection.disconnect();
  }
  process.exit();
});
//#endregion
