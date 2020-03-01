//#region Variables
//Discord
const fs = require('fs');
const {token, authorID} = require('./config.json');
const Discord = require('discord.js');
const client = new Discord.Client();

//First-Party
const data = require('./utility/dataManipulation.js')
const utility = require('./utility/utility.js')
const validate = require('./utility/validator.js').validate;

//Persistent Data
client.guildTags = new Discord.Collection();
client.commands = new Discord.Collection();
client.volume = 0.5;
client.creatureSounds = new Discord.Collection(); //key = creatureName, value = sounds[]
client.allSounds = new Discord.Collection();      //key = soundID,      value = sound
client.categorySounds = new Discord.Collection();
client.filePathSounds = new Discord.Collection();
client.browniePoints = new Discord.Collection();  //key = userID,        value = numBrowniePoints
client.guildData = new Discord.Collection();
client.numSounds = 0;
client.updates = [];
client.messageReceivedTime = 0;
client.getPrefix = data.getPrefix;     //REPLACE WITH GUILDSPECIFIC PREFIXES
client.setPrefix = data.setPrefix;
client.authorID = authorID  //Is this the best way?
client.guildData = new Discord.Collection();

//Discord.Permissions.FLAGS.ADMINISTRATOR
//if(message.member.hasPermission(Discord.Permissions.FLAGS.ADMINISTRATOR))

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
  console.log('Ready!');
});

client.on('message', message => {
  //If bosstalk is mentioned.
  if(message.mentions.members && message.mentions.members.has(client.user.id)){
    return message.channel.send(`Hi, I'm boss-talk! Try **${message.client.getPrefix(message)}help**`)
  }

  prefix = message.client.getPrefix(message);
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  client.messageReceivedTime = new Date(Date.now()); 
  console.log(`Command: T=${client.messageReceivedTime.toTimeString()}, by ${message.author.username}: "${message.content}"`);

  params = utility.getParamsFromMessage(message);
  command = params.command;
  args = params.args;

  try {
    validation = validate(message, args, command);
    if(validation.isValid){
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
  /*
  try {
    if(command.authorOnly == true && message.author.id == authorID){
      console.log("Author only!")
      command.execute(message, args)
    }
    else if (command.authorOnly == true && message.author.id != authorID){
      return;
    }
    else if(command.guildOnly && message.channel.type == "text"){
      console.log("Regular!")
      command.execute(message, args)
    }
    else{
      message.channel.send("I can only do that in a server.")
    }
  }
  catch (error) {
      console.error(error);
      message.reply('There was an error trying to execute that command!');
  }*/
});

client.on('error', console.error);
//#endregion

//#region Interrupt handler
process.on('SIGINT', function() {
  console.log("Caught interrupt signal");

  for(const connection of client.voiceConnections.values()){
    connection.disconnect();
  }
  process.exit();
});
//#endregion
