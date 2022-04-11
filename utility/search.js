const utility = require('./utility.js');

module.exports.search = function(message, args){
  let data = {};
  data.header = [];
  data.content = [];
  arg = args[0].toLowerCase();

  //If the file keyword is used
  if(arg === "file" && args.length > 1){
    data = searchFileNames(message, args, data);
    return data;
  }

  if(arg == "expansion" || arg == "expansions"){
    data.header.push(prettyString("**Expansions:**", Array.from(message.client.categorySounds.keys())))
    return data;
  }

  if(arg == "location" || arg == "locations"){
    data.header.push(`There are a lot of them, try searching by expansion.`);
    return data;
  }

  if(arg == "creature" || arg == "creatures"){
    data.header.push(`There are a lot of them, try searching by location or expansion.`);
    return data;
  }

  if(arg == "soundID"){
    data.header.push(`You gotta enter a specific number.`);
    return data;
  }

  if(arg =="random"){
    soundID = Math.floor(Math.random() * message.client.numSounds) + 1;
    creature = message.client.allSounds.get(soundID).creatureName;
    return prettyCreature(message, creature, data);
  }

  //If it's an expansion
  if(message.client.categorySounds.has(arg)){
    data.header.push(`**Expansion:** ${arg}`)
    data.header.push(prettyString("**Locations:** ", Array.from(message.client.categorySounds.get(arg).keys())));
    return data;
  }

  //If it's a location in an expansion
  for (const valueKey of Array.from(message.client.categorySounds.entries())){
    let expansion = valueKey[0]; //String
    let locations = valueKey[1]; //Discord.js Collection
    if(locations.has(arg)){
      locationFound = true;
      data.header.push(``);
      data.header.push(`**Expansion:** ${expansion}`);
      data.header.push(`**Location:** ${arg}`);
      data.header.push(prettyString("**Creatures:** ", Array.from(locations.get(arg))));
      return data;
    }
  }

  //if its a creature
  if (message.client.creatureSounds.has(arg)){
    return prettyCreature(message, arg, data);
  }

  //if its a soundID
  if (message.client.allSounds.has(parseInt(arg))){
    return prettySound(message, arg, data);
  }

  //if it's part of a creature
  let creatureList = [];
  let matchFound = false;
  for(const creatureName of Array.from(message.client.creatureSounds.keys())){
    //If the creature's name has the search term
    if(creatureName.includes(arg)){
      if(!matchFound){
        data.header.push(`**Matching Creatures**`);
        matchFound = true;
      }
      creatureList.push(`${creatureName}`)
    }
  }


  //If we only found one creature, return that creature.
  if(creatureList.length == 1){
    creature = message.client.creatureSounds.get(creatureList[0]);
    return prettyCreature(message, creature.name, data);
  }

  //If we found more than one creature, push formatted names onto data.
  if(matchFound && creatureList.length < 100){
    for(const creatureName of creatureList){
      data.content.push(creatureName);
    }
  }
  else if(creatureList.length >= 100){
    data.header = (`Too many creatures found. Try reducing your search.`);
  }

  //If data has nothing in it.
  if(data.header.length == 0 && data.content.length == 0){
    data.header.push(`No info found for ${arg}`)
    return data;
  }
  else{
    return data;
  }
};

function prettyString(title, array){
  let aString = `${title.charAt(0).toUpperCase() + title.slice(1)}`;
  for(const item of array){
    aString = aString.concat(`\`${item}\`, `);
  }

  return aString.substring(0, aString.length-2);
}

function prettyCreature(message, creatureName, data){

  creature = message.client.creatureSounds.get(creatureName);
  numSounds = creature.sounds.length;
  data.header.push(`**Creature:** ${creatureName}`);

  if(creature.positions.length == 1 && creature.positions[0].expansion == ""){
    data.header.push("**Expansion:** \`unknown\`");
  }
  else if (creature.positions.length == 1){
    data.header.push(prettyString("**Expansion:** ", creature.positions.map(position => position.expansion)));
  }
  else{
    data.header.push(prettyString("**Expansions:** ", creature.positions.map(position => position.expansion)));
  }

  if(creature.positions.length == 1 && creature.positions[0].location == ""){
    data.header.push("**Location:** \`unknown\`");
  }
  else if(creature.positions.length == 1){
    data.header.push(prettyString("**Location:** ", creature.positions.map(position => position.location)));
  }
  else{
    data.header.push(prettyString("**Locations:** ", creature.positions.map(position => position.location)));
  }
  data.header.push(`${creatureName} has ${numSounds} sounds between index ${creature.sounds[0].id} and ${creature.sounds[numSounds - 1].id}.`);
  for(sound of creature.sounds){
    /*
    if (utility.listOfStringsLength(fData) > 1800){
      fData.push(`\`\`\``);
      message.channel.send(fData.join("\n"));
      fData = [];
      fData.push(`\`\`\``);
    }
    */
    let fileName = sound.filePath.slice(sound.filePath.indexOf(sound.creatureName) + sound.creatureName.length + 1);
    let spaces = " ".repeat(80 - fileName.length);
    data.content.push(`${sound.id}: ${fileName}\t` + spaces + `${sound.position.expansion} ${sound.position.location}`); //creature/creatureName/filename.ogg
  }
  return data;
}


function prettySound(message, soundID, data){
  sound = message.client.allSounds.get(parseInt(soundID));
  creature = message.client.creatureSounds.get(sound.creatureName);
  numSounds = creature.sounds.length;

  data.header.push(`**Creature:** ${sound.creatureName}`);
  data.header.push(`**Expansion:** ${sound.position.expansion}`);
  data.header.push(`**Location:** ${sound.position.location}`);
  data.header.push(`${sound.creatureName} has ${numSounds} sounds between index ${creature.sounds[0].id} and ${creature.sounds[numSounds - 1].id}.`);

  return data;
}

//Look through all sounds
function searchFileNames(message, args, data){
  arg = args[1].toLowerCase();
  let matches = message.client.allSounds.filter(sound => sound.filePath.includes(arg));

  for(sound of matches.array()){
    /*
    if (utility.listOfStringsLength(fData) > 1800){
      fData.push(`\`\`\``);
      message.channel.send(fData.join("\n"));
      fData = [`\`\`\``];
    }*/
    let fileName = sound.filePath.slice(sound.filePath.indexOf(sound.creatureName));
    let spaces = " ".repeat(80 - fileName.length);
    data.content.push(`${sound.id}: ${fileName}\t` + spaces + `${sound.position.expansion} ${sound.position.location}`); //creature/creatureName/filename.ogg
  }

  return data;
}
