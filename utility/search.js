const utility = require('./utility.js');
module.exports.search = function(message, args){
  data = [];
  arg = args[0].toLowerCase();

  //If the file keyword is used
  if(arg === "file" && args.length > 1){
    data = searchFileNames(message, args);
    return data;
  }

  if(arg == "expansion" || arg == "expansions"){
    data.push(prettyString("**Expansions:**", message.client.categorySounds.keyArray()))
    return data;
  }

  if(arg == "location" || arg == "locations"){
    data.push(`There are a lot of them, try searching by expansion.`);
    return data;
  }

  if(arg == "creature" || arg == "creatures"){
    data.push(`There are a lot of them, try searching by location or expansion.`);
    return data;
  }

  if(arg == "soundID"){
    data.push(`You gotta enter a specific number.`);
    return data;
  }

  if(arg =="random"){
    soundID = Math.floor(Math.random() * message.client.numSounds) + 1;
    creature = message.client.allSounds.get(soundID).creatureName;
    return prettyCreature(message, creature);
  }

  //If it's an expansion
  if(message.client.categorySounds.has(arg)){
    data.push(`**Expansion:** ${arg}`)
    data.push(prettyString("**Locations:** ", message.client.categorySounds.get(arg).keyArray()));
    return data;
  }

  //If it's a location in an expansion
  let locationFound = false;
  for (const valueKey of Array.from(message.client.categorySounds.entries())){
    let expansion = valueKey[0]; //String
    let locations = valueKey[1]; //Discord.js Collection
    if(locations.has(arg)){
      locationFound = true;
      data.push(``);
      data.push(`**Expansion:** ${expansion}`);
      data.push(`**Location:** ${arg}`);
      data.push(prettyString("**Creatures:** ", Array.from(locations.get(arg))));
    }
  }
  if (locationFound){
    return data;
  }

  //if its a creature
  if (message.client.creatureSounds.has(arg)){
    return prettyCreature(message, arg);
  }

  //if its a soundID
  if (message.client.allSounds.has(parseInt(arg))){
    return prettySound(message, arg);
  }

  //if it's part of a creature
  let creatureList = [];
  let matchFound = false;
  for(const creatureName of message.client.creatureSounds.keyArray()){
    //If the creature's name has the search term
    if(creatureName.includes(arg)){
      if(!matchFound){
        data.push(`**Matching Creatures**`);
        matchFound = true;
      }
      creatureList.push(`${creatureName}`)
    }
  }


  //If we only found one creature, return that creature.
  if(creatureList.length == 1){
    console.log(`1 Creature found after ${Date.now() - message.client.tempTime} ms.`);

    creature = message.client.creatureSounds.get(creatureList[0]);
    return prettyCreature(message, creature.name);
  }

  //If we found more than one creature, push formatted names onto data.
  if(matchFound && creatureList.length < 100){
    for(const creatureName of creatureList){
      data.push(creatureName);
    }
    console.log(`Multiple creatures found after ${Date.now() - message.client.tempTime} ms.`);
  }
  else if(creatureList.length >= 100){
    data = (`Too many creatures found. Try reducing your search.`);
  }

  //If data has nothing in it.
  if(!data.length){
    data.push(`No info found for ${arg}`)
    return data;
  }
  else{
    return data;
  }
};

function prettyString(title, array){
  let aString = `${title.charAt(0).toUpperCase() + title.slice(1)}: `;
  for(const item of array){
    aString = aString.concat(`${item}, `);
  }

  return aString.substring(0, aString.length-2);;
}

function prettyCreature(message, creatureName){
  let fData = [];

  creature = message.client.creatureSounds.get(creatureName);
  numSounds = creature.sounds.length;
  fData.push(`**Creature:** ${creatureName}`);
  fData.push(prettyString("**Expansions:** ", creature.positions.map(position => position.expansion)));
  fData.push(prettyString("**Locations:** ", creature.positions.map(position => position.location)));
  fData.push(`${creatureName} has ${numSounds} sounds between index ${creature.sounds[0].id} and ${creature.sounds[numSounds - 1].id}.`);
  fData.push(`\`\`\``)
  for(sound of creature.sounds){
    if (utility.listOfStringsLength(fData) > 1800){
      fData.push(`\`\`\``);
      message.channel.send(fData);
      fData = [];
      fData.push(`\`\`\``);
    }
    let fileName = sound.filePath.slice(sound.filePath.indexOf(sound.creatureName) + sound.creatureName.length + 1);
    let spaces = " ".repeat(80 - fileName.length);
    fData.push(`${sound.id}: ${fileName}\t` + spaces + `${sound.position.expansion} ${sound.position.location}`); //creature/creatureName/filename.ogg
  }
  fData.push(`\`\`\``);
  return fData;
}


function prettySound(message, soundID){
  let fData = [];
  sound = message.client.allSounds.get(parseInt(soundID));
  creature = message.client.creatureSounds.get(sound.creatureName);
  numSounds = creature.sounds.length;

  fData.push(`**Creature:** ${sound.creatureName}`);
  fData.push(`**Expansion:** ${sound.position.expansion}`);
  fData.push(`**Location:** ${sound.position.location}`);
  fData.push(`${sound.creatureName} has ${numSounds} sounds between index ${creature.sounds[0].id} and ${creature.sounds[numSounds - 1].id}.`);


  console.log(`3 ${fData}`)
  return fData;
}

//Look through all sounds
function searchFileNames(message, args){
  arg = args[1].toLowerCase();
  let matches = message.client.allSounds.filter(sound => sound.filePath.includes(arg));
  fData = [`\`\`\``];
  for(sound of matches.array()){
    if (utility.listOfStringsLength(fData) > 1800){
      fData.push(`\`\`\``);
      message.channel.send(fData);
      fData = [`\`\`\``];
    }
    let fileName = sound.filePath.slice(sound.filePath.indexOf(sound.creatureName));
    let spaces = " ".repeat(80 - fileName.length);
    fData.push(`${sound.id}: ${fileName}\t` + spaces + `${sound.position.expansion} ${sound.position.location}`); //creature/creatureName/filename.ogg
  }
  fData.push(`\`\`\``);
  console.log(fData);
  return fData;
}
