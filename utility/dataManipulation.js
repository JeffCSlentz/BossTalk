const fs = require('fs');
const utility = require('./utility.js');
const Discord = require('discord.js');
const Creature = require('./classes/Creature.js');
const Position = require('./classes/Position.js');
const Sound = require('./classes/Sound.js').default;

module.exports = {
    clearLocationFromCreature(message, creatureName){
      let creature = message.client.creatureSounds.get(creatureName);
      let position = creature.positions[0];
      position.expansion = "";
      position.location = "";

      creature.positions = [];
      creature.positions.push(position);
      for(const sound of creature.sounds){
        sound.position.expansion = "";
        sound.position.location = "";
      }
      module.exports.addCreatureToData(message.client, creatureName);
      writeCreatureSounds(message);
    },
    clearSpecificLocationFromCreature(message, creatureName, location){
      let creature = message.client.creatureSounds.get(creatureName);

      for(let i = 0; i < creature.positions.length; i++){
        if(creature.positions[i].location === location){
          creature.positions.splice(i, 1);
          module.exports.addCreatureToData(message.client, creatureName);
          writeCreatureSounds(message);
          return true;
        }
      }
      return false;
    },
    giveLocationToCreature(message, creatureName, position){
      creature = message.client.creatureSounds.get(creatureName);

      //Push position to all positionless sounds.
      for(const sound of message.client.creatureSounds.get(creatureName).sounds){
        if(sound.position.expansion == "" && sound.position.location == ""){
          sound.position = position;
        }
      }

      //Put or push a position on.
      let thanksText = "";
      if(creature.positions[0].expansion == "" || creature.positions[0].location == ""){
        creature.positions[0] = position;
        myArray = [`THANKS! You get 10 BROWNIE POINTS!!! (づ｡◕‿‿◕｡)づ`,
                   `WOW! SO NICE. 10 BROWNIE POINTS for you! (◠‿◠✿)`,
                   `NOW THATS WHAT I CALL HELPFUL! 10 BROWNIES. (ﾟヮﾟ)`,
                   `☆(◒‿◒)☆ LOOK AT YOU GO. +10 BROWNIE POINTS ☆(◒‿◒)☆`,
                   `(*・∀・*)人(*・∀・*) the power of teamwork earns you 10 BROWNIE POINTS`];
        thanksText = myArray[Math.floor(Math.random() * myArray.length)];
        localAddBrowniePoints(message, 10);
      }
      else {
        creature.positions.push(position);
        thanksText = "Thanks! This guy already had a location, so you get 5 brownie points.";
        localAddBrowniePoints(message, 5);
      }

      var text = `Updated ${creatureName} with expansion = ${position.expansion}, location = ${position.location}`;
      console.log(text);
      message.client.updates.push(text);
      writeCreatureSounds(message);
      module.exports.addCreatureToData(message.client, creatureName);
      return thanksText;
    },
    giveLocationToSoundRange(message, soundIDStart, soundIDEnd, position){
      if (!message.client.allSounds.has(soundIDStart) || !message.client.allSounds.has(soundIDEnd)){
        return "I don't recognize one or both of those sound numbers.";
      }

      if(soundIDStart > soundIDEnd){
        return "The second sound is smaller than the first.";
      }

      if(message.client.allSounds.get(soundIDStart).creatureName !== message.client.allSounds.get(soundIDEnd).creatureName){
        return "This sound range would affect more than one creature.";
      }

      let thanksText = [];
      for(let i = soundIDStart; i <= soundIDEnd; i++){
        if (utility.listOfStringsLength(thanksText) > 1800){
          message.channel.send(thanksText);
          thanksText = [];
        }
        thanksText.push(module.exports.giveLocationToSound(message, i, position, false));
      }
      writeCreatureSounds();
      return thanksText;
    },
    giveLocationToListOfSounds(message, sounds, position){
      let thanksText = [];
      for(sound of sounds){
        if (utility.listOfStringsLength(thanksText) > 1800){
          message.channel.send(thanksText);
          thanksText = [];
        }
        thanksText.push(module.exports.giveLocationToSound(message, sound.id, position, false));
      }
      writeCreatureSounds();
      return thanksText;
    },
    giveLocationToSound(message, soundID, position, write){
      if(message.client.allSounds.has(soundID)){
        //We have to modify the creatureSounds (everything else derives from it).
        let creature = message.client.creatureSounds.get(message.client.allSounds.get(soundID).creatureName);
        for(sound of creature.sounds){
          if(sound.id == soundID){
            sound.position = position;
            givePosition(creature, position);
            module.exports.addCreatureToData(message.client, creature.name);
            if(write){
              writeCreatureSounds(message);
            }
            return `Changed sound ${soundID}'s position to ${position.expansion}, ${position.location}.`;
          }
        }
      }
      else{
        return `Couldn't find sound ${soundID}`;
      }
    },
    writeGuildTags(message){
      console.log(`49: dataManipulation.js`);
      console.log(`${JSON.stringify([...message.client.guildTags])}`);
      fs.writeFile('./data/guildTags.json', JSON.stringify([...message.client.guildTags]), (err) => {
        if (err) throw err;
        console.log('Wrote guildTags to ./guildTags.json!');
      });
    },
    AddBrowniePoints(message, amount){
      localAddBrowniePoints(message, amount);
    },
    addCreatureToData(client, creatureName){
      addCreatureToAllSounds(client, creatureName);
      addCreatureToCategorySounds(client, creatureName);
      addCreatureToFilePathSounds(client, creatureName);
    },
    loadFiles(client, dataFolder, dataList){
      dataList = ["creatureSounds", "guildTags", "browniePoints"]

      for (item of dataList){
        try {
          client[item] = getDiscordCollectionFromJSON(`${dataFolder}/${item}.json`);
          console.log(`Found ${item}.json`)
        }
        catch(error) {
          console.log(error)
          console.log(`No file found, starting from empty ${item}.`);
        }
      }
    },
    loadCommands(client, commandsFolder){
      for(const file of fs.readdirSync(`${commandsFolder}`)){
        const command = require(`../commands/${file}`);
        client.commands.set(command.name, command);
      }
      console.log("Loaded Commands")
    },
    checkForNewCreatures(client,creatureFiles){
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
            module.exports.addCreatureToData(client, folder);
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
};

function getDiscordCollectionFromJSON(filePath){
  try {
    return new Discord.Collection(JSON.parse(fs.readFileSync(filePath)));
  }
  catch(error) {
    console.log("getDiscordCollectionFromJSON went wrong")
    console.log(error)
    throw error;
  }
}

//Adds a creature object to allSounds collection.
function addCreatureToAllSounds(client, creatureName){
  for (const sound of client.creatureSounds.get(creatureName).sounds){
    client.allSounds.set(sound.id, sound);
  }
}

//Give a creature a position. Do nothing if it already has that position.
function givePosition(creature, position){
  for(pos of creature.positions){
    if(pos.expansion === "" && pos.location === ""){
      pos.expansion = position.expansion;
      pos.location = position.location;
      return;
    }
    if(pos.expansion === position.expansion && pos.location === position.location){
      return;
    }
  }
  creature.positions.push(position);
  return;
}

//Adds a creature object to categorySounds collection.
function addCreatureToCategorySounds(client, creatureName){
  creature = client.creatureSounds.get(creatureName);
  //For each position the creature has
  for (const position of creature.positions){
    let locationCollection = utility.GetAlwaysFromCollection(client.categorySounds, position.expansion, new Discord.Collection());
    let creatureSet =  utility.GetAlwaysFromCollection(locationCollection, position.location, new Set());
    try {
      creatureSet.add(creatureName);
    }
    catch(error) {
      console.log("Likely that creatureSet is expected to be a set.");
      console.error(error);
    }
  }
}

//Adds a creature object to filePathSounds collection.
function addCreatureToFilePathSounds(client, creatureName){
  for(const sound of client.creatureSounds.get(creatureName).sounds){
    client.filePathSounds.set(sound.filePath, sound);
  }
}

function localAddBrowniePoints(message, amount){
   let browniePoints = utility.GetAlwaysFromCollection(message.client.browniePoints, message.author.id, 0)
   message.client.browniePoints.set(message.author.id, browniePoints + amount);
   writeBrowniePoints(message);
   return message.client.browniePoints.get(message.author.id);
}

function writeBrowniePoints(message){
  fs.writeFile('./data/browniePoints.json', JSON.stringify([...message.client.browniePoints]), (err) => {
    if (err) throw err;
    console.log('Wrote browniePoints to ./browniePoints.json!');
  });
}

function writeCreatureSounds(message){
  fs.writeFile('./data/creatureSounds.json', JSON.stringify([...message.client.creatureSounds]), (err) => {
    if (err) throw err;
    console.log('Wrote creatureSounds to ./creatureSounds.json!');
  });
}
