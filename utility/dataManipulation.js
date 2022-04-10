const fs = require('fs');
const utility = require('./utility.js');
const Discord = require('discord.js');
const Creature = require('./classes/Creature.js');
const Position = require('./classes/Position.js');
const Sound = require('./classes/Sound.js');
const logger = require('./logger.js').logger;

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
      writeCreatureSounds(message);
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
      writeCreatureSounds(message);
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
      fs.writeFile('./data/guildTags.json', JSON.stringify([...message.client.guildTags]), (err) => {
        if (err) throw err;
        logger.info('Wrote guildTags to ./guildTags.json!');
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
      discordCollection = "discordCollection"
      anArray = "anArray"
      dataList = [["creatureSounds", discordCollection],
                  ["guildTags", discordCollection],
                  ["browniePoints", discordCollection], 
                  ["updateRequests", anArray],
                  /*["guildData", discordCollection]*/]

      for (item of dataList){
        try {
          client[item[0]] = getFromJSON(`${dataFolder}/${item[0]}.json`,item[1]);
          logger.info(`Loaded ${item[0]}.json`)
        }
        catch(error) {
          logger.error(error)
          logger.error(`No file found, starting from empty ${item[0]}.`);
        }
      }
    },
    loadCommands(client, commandsFolder){
      for(const file of fs.readdirSync(`${commandsFolder}`)){
        const command = require(`../commands/${file}`);
        client.commands.set(command.name, command);
      }
      logger.info("Loaded Commands")
    },
    checkForNewCreatures(client,creatureFiles){
      let uniqueSoundID = 1;
      let newDataFound = false;
      let bannedWords = ["wound", "attack", "crit", "battleshout"];
      //Iterate through all creature folders, building up runtime data OR adding new creatures not yet seen.
      let iter = 0
      for (const folder of creatureFiles)
      {
        
        if (client.creatureSounds.has(folder)){
          creature = client.creatureSounds.get(folder);
          currentSounds = creature.sounds;
          fileSounds = fs.readdirSync(`./sounds/creature/${folder}`);

          let dataIndex = 0;
          let fileIndex = 0;
          let insertAtIndexOffset = 0;
          let soundsToPush = [];
          while(dataIndex < currentSounds.length && fileIndex < fileSounds.length){
            let dataSoundName = currentSounds[dataIndex].filePath.split('/').pop()
            let fileSoundName = fileSounds[fileIndex]
            let filePath = `./sounds/creature/${folder}/${fileSoundName}`

            if(fs.statSync(filePath)["size"] > 4200 && !bannedWords.some(word => filePath.includes(word)) && dataSoundName != fileSoundName){
              newDataFound = true;
              let position = new Position("","");
              if(creature.positions.length == 1){
                position = creature.positions[0]
              }
              let sound = new Sound(0, "", position, filePath, folder);
              soundsToPush.push({index:dataIndex+insertAtIndexOffset, sound:sound});
              insertAtIndexOffset++;
            }else{
              dataIndex++;
            }
            fileIndex++;
            ;
          }
          for(soundInsertObject of soundsToPush){
            currentSounds.splice(soundInsertObject.index, 0, soundInsertObject.sound);
          }
          
          creature.sounds = currentSounds.filter(sound => (fs.statSync(sound.filePath)["size"] > 4200 && !bannedWords.some(word => sound.filePath.includes(word))));
          

          //Re-index sounds.
          if(creature.sounds.length != 0){
            for(sound of creature.sounds){
              sound.id = uniqueSoundID;
              uniqueSoundID++;
            }
            module.exports.addCreatureToData(client, folder);
          }
          else{
            client.creatureSounds.delete(folder)
          }
        }
        //Otherwise, create this creature.
        else{
          newDataFound = true;
          let creature = new Creature(folder, [new Position("", "")], []);
          let soundFiles = fs.readdirSync(`./sounds/creature/${folder}`);

          // Add sounds to this new creature, ignoring bad ones, and incrementing uniqueSoundID counter.
          logger.info(`Creating ${folder}`);
          for(const file of soundFiles){
            if (bannedWords.some(word => file.includes(word))){
            }
            else{
              //logger.info(` Adding sound ${file}`);
              let sound = new Sound(uniqueSoundID, "", new Position("", ""), `./sounds/creature/${folder}/${file}`, folder);
              creature.sounds.push(sound);
              uniqueSoundID++;
            }
          }
          //Add this creature to the creatureSounds collection.
          if(creature.sounds.length != 0){
            client.creatureSounds.set(creature.name, creature);
            module.exports.addCreatureToData(client, folder);
          }
        }
      }
      client.numSounds = uniqueSoundID - 1;
      if (newDataFound){
        console.log("NEW DATA FOUND: Writing creatureSounds to JSON")
        module.exports.writeDiscordCollectionToJSON(client.creatureSounds, `./data/creatureSounds.json`)
      }
    },
    writeToUpdateRequests(message, args){
      args = "update " + args.join(" ")
      if(message.client.updateRequests){
        message.client.updateRequests.push(args)
      }
      else{
        message.client.updateRequests = [args];
      }
      fs.writeFile('./data/updateRequests.json', JSON.stringify(message.client.updateRequests), (err) => {
        if (err) throw err;
        logger.info('Wrote updateRequests to ./updateRequests.json!');
      });

      return "Thank you for your suggestion!"
    },
    writeDiscordCollectionToJSON(collection, filePath){
      fs.writeFile(filePath, JSON.stringify([...collection]), (err) => {
        if (err) throw err;
        logger.info(`Wrote to ${filePath}!`);
      });
    }
};

function getFromJSON(filePath, type){
  switch(type) {
    case "discordCollection":
      try {
        return new Discord.Collection(JSON.parse(fs.readFileSync(filePath)));
      }
      catch(error) {
        logger.error("Getting collection from Discord.Collection went wrong")
        logger.error(error)
        throw error;
      }
    case "anArray":
      try {
        return new Array(JSON.parse(fs.readFileSync(filePath)));
      }
      catch(error) {
        logger.error("Getting collection from array went wrong")
        logger.error(error)
        throw error;
      }
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

//client.categorySounds.get(EXPANSION_NAME)
//returns a discord collection (key=LOCATION_NAME, val=set(CREATURE_NAMES))

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
      logger.error("Likely that creatureSet is expected to be a set.");
      logger.error(error);
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
    logger.info('Wrote browniePoints to ./browniePoints.json!');
  });
}

function writeCreatureSounds(message){
  fs.writeFile('./data/creatureSounds.json', JSON.stringify([...message.client.creatureSounds]), (err) => {
    if (err) throw err;
    logger.info('Wrote creatureSounds to ./creatureSounds.json!');
  });
}
