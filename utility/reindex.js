const fs = require('fs');
const logger = require('./logger.js').logger;
const db = require('./db.js');

console.log(db.config.dynamoDBTables.creatures);
console.log(db.tables.creatures)

function reindex(){

  const creatureFiles = fs.readdirSync('./sounds/creature');

  for (const folder of creatureFiles){
    let bannedWords = ["wound", "attack", "crit", "battleshout"];
    let creature =  {
                      "creature": folder,
                      "sounds": []
                    }
    
    let soundFiles = fs.readdirSync(`./sounds/creature/${folder}`);
  
    logger.info(`Creating ${folder}`)
  }
}

//First, add basic data to dynamodb

/*
module.exports = {reindexCreatures(client,creatureFiles){
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
            logger.info(` Adding sound ${file}`);
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
  }
}*/