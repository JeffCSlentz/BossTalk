//#region Variables
//Discord
const fs = require('fs');
const {prefix, token} = require('./config.json');
const Discord = require('discord.js');
const client = new Discord.Client();

//First-Party
const data = require('./utility/dataManipulation.js')
const utility = require('./utility/utility.js')

//Persistent Data
client.guildTags = new Discord.Collection();
client.commands = new Discord.Collection();
client.volume = 0.5;
client.creatureSounds = new Discord.Collection(); //key = creatureName, value = sounds[]
client.allSounds = new Discord.Collection();      //key = soundID,      value = sound
client.categorySounds = new Discord.Collection();
client.filePathSounds = new Discord.Collection();
client.browniePoints = new Discord.Collection();  //key = userID,        value = numBrowniePoints
client.numSounds = 0;
client.updates = [];
client.messageReceivedTime = 0;
client.prefix = prefix;   //REPLACE WITH GUILDSPECIFIC PREFIXES

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
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  client.messageReceivedTime = new Date(Date.now()); 
  console.log(`Command: T=${client.messageReceivedTime.toTimeString()}, by ${message.author.username}: "${message.content}"`);

  command = utility.getCommandFromMessage(message);
  args = utility.getArgsFromMessage(message);

  try {
    if(command.guildOnly && message.channel.type == "text"){
      command.execute(message, args)
    }
    else{
      message.channel.send("I can only do that in a server.")
    }
  }
  catch (error) {
      console.error(error);
      message.reply('There was an error trying to execute that command!');
  }
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
