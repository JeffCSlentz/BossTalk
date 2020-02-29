//#region Variables

//Discord
const fs =              require('fs');
const {prefix, token} = require('./config.json');
const Discord =         require('discord.js');
const client = new Discord.Client();

//Third-Party
const Enmap =           require('enmap');
const EnmapLevel =      require('enmap-level');

//First-Party
const data =            require('./utility/dataManipulation.js')
//const utility =         require('./utility/utility.js')
const Creature =        require('./utility/classes/Creature.js');
const Position =        require('./utility/classes/Position.js');
const Sound =           require('./utility/classes/Sound.js').default;

//Persistent Data
client.guildTags = new Enmap({provider: new EnmapLevel({name: "guildTags"})});
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
const uselessCreaturesFolder = './sounds/useless';

const commandFiles = fs.readdirSync(commandsFolder);
const creatureFiles = fs.readdirSync(creaturesFolder);

//#endregion

//TODO remove these and replace with enmaps
function writeMapSync(folder, map){
  writeFileSync(folder, JSON.stringify([...map]));
}


function readMapSync(folder){
  try {
    return new Discord.Collection(JSON.parse(fs.readFileSync(folder)));;
  }
  catch(error) {
    console.log("readmapSync went wrong")
    throw error;
  }
}

//Get commands from the commands folder.
function loadCommands(){
  for(const file of fs.readdirSync(commandsFolder)){
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
  }
}

//Load runtime data from persistent data.
function loadFiles(){
  try {
    client.creatureSounds = readMapSync(`${dataFolder}/creatureSounds.json`);
    console.log("Found creatureSounds.json")
  }
  catch(error) {
    console.log("No file found, starting from empty creatureSounds.");
  }

  //Load in user Favorites
  /*
  try {
    client.userFavorites = readMapSync(`${dataFolder}/userFavorites.json`);
    console.log("Found userFavorites.json")
  }
  catch(error) {
    console.log("No file found, starting from empty userFavorites.");
  }*/


  try {
    client.browniePoints = readMapSync(`${dataFolder}/browniePoints.json`);
    console.log("Found browniePoints.json")
  }
  catch(error) {
    console.log("No file found, starting from empty browniePoints.");
  }
}

function loadCreatures(){
  let first = false;
  let uniqueSoundID = 1;

  //Iterate through all creature folders, building up runtime data OR adding new creatures not yet seen.
  for (const folder of creatureFiles)
  {
    //If the creatureSounds collection already has this creature, add it to our runtime sounds.
    if (client.creatureSounds.has(folder)){
      if(client.creatureSounds.get(folder).sounds.length > 0){  //Check if this folder has any sound files.
        
        let sounds = client.creatureSounds.get(folder).sounds;
        //Remake all creature's sound ID's.
        for(sound of sounds){
          sound.id = uniqueSoundID;
          client.numSounds = uniqueSoundID;
          uniqueSoundID++;
        }

        data.addCreatureToData(client, folder);

        /*
        //Add this creature to allSounds and categorySounds collection.
        addCreatureToAllSounds(folder);
        addCreatureToCategorySounds(folder);
        addCreatureToFilePathSounds(folder);
        */
      } else {
        console.log(`skipped ${folder}`);
      }

    }
    //Otherwise, create this creature.
    else{
      throw "what";
      let creature = new Creature(folder, [new Position("", "")], []);
      let soundFiles = readdirSync(`${creaturesFolder}/${folder}`);
      let bannedWords = ["wound", "attack", "crit", "battleshout"];

      // Add sounds to this new creature, ignoring bad ones, and incrementing uniqueSoundID counter.
      console.log(`Creating ${folder}`);
      for(const file of soundFiles){
        if (bannedWords.some(word => file.includes(word))){
        }
        else{
          console.log(` Adding sound ${file}`);
          let sound = new Sound(uniqueSoundID, "", new Position("", ""), `${creaturesFolder}/${folder}/${file}`, folder);
          client.numSounds = uniqueSoundID;
          creature.sounds.push(sound);
          uniqueSoundID++;
        }
      }

      //Add this creature to the creatureSounds collection.
      client.creatureSounds.set(creature.name, creature);
      addCreatureToData(client, folder);

    }
  }
}

function startup(){
  loadCommands();
  loadFiles();
  loadCreatures();
  client.login(token);
}

startup();

client.on('ready', () => {
  console.log('Ready!');
});

client.on('message', message => {
  client.tempTime = Date.now();

  if (!message.content.startsWith(prefix) || message.author.bot) return;

  console.log(`Cmd: T=${client.tempTime}, by ${message.author.username}: "${message.content}"`);


  let args = message.content.slice(prefix.length).split(' ');
  console.log(args);
  let command = args.shift().toLowerCase();

  if (!client.commands.has(command)){

    args = [command];
    console.log(args);
    command = "play";
  }

  try {
    client.commands.get(command).execute(message, args);
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



