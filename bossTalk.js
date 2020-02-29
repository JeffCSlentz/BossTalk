//#region Variables
//Discord
const fs = require('fs');
const {prefix, token} = require('./config.json');
const Discord = require('discord.js');
const client = new Discord.Client();

//First-Party
const data = require('./utility/dataManipulation.js')

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
client.tempTime = 0;

//constants
const dataFolder = './data';
const commandsFolder = './commands';
const creaturesFolder = './sounds/creature';
const creatureFiles = fs.readdirSync(creaturesFolder);
//#endregion

function startup(){
  data.loadCommands(client, commandsFolder);
  data.loadFiles(client, dataFolder, ["creatureSounds", "guildTags", "browniePoints"])
  data.checkForNewCreatures(client, creatureFiles);
  client.login(token);
}

startup();

client.on('ready', () => {
  console.log('Ready!');
});

client.on('message', message => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  client.tempTime = Date.now();
  console.log(`Cmd: T=${client.tempTime}, by ${message.author.username}: "${message.content}"`);

  let args = message.content.slice(prefix.length).split(' ');
  let command = args.shift().toLowerCase();
  
  if (!client.commands.has(command)){
    args = [command];
    command = "play";
  }

  try {
    command = client.commands.get(command)
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

client.on('disconnect', closeEvent => {
  for(const connection of client.voiceConnections.array()){
    connection.leave();
  }
});



