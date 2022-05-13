const { getVoiceConnection, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const logger = require('./logger').logger;
const Creature = require('../src/classes/Creature');

module.exports = {
  GetAlwaysFromCollection(collection, key, value) {
    if(collection.has(key)){
      value = collection.get(key);
    }
    else{
      collection.set(key, value);
    }
    return value;
  },
  listOfStringsLength(list){
    let total = 0;
    for(item of list){
      total += item.length;
    }
    return total;
  },
  getParamsFromMessage(message){
    let args = message.content.slice(message.client.bosstalk.getGuildProperty(message.guild, "prefix").length).split(' ');
    let command = args.shift().toLowerCase();
    if (!message.client.commands.has(command)){
      args = [command];
      command = "play";
    }
    if(args.length == 1 && args[0] == ""){
      args = [];
    }
    return {args:args, command:message.client.commands.get(command)}
  },
  getFileNameFromFilePath(filePath, keepOGG = false){
    return keepOGG? filePath.slice(filePath.lastIndexOf("/") + 1) : filePath.slice(filePath.lastIndexOf("/") + 1,-4);
  },
  getFilePathFromFileName(creatureName, fileName){
    fileName = module.exports.fixOGG(module.exports.stripAsterisk(fileName));
    let filePath = `./sounds/creature/${creatureName}/${fileName}`
    return filePath;
  },
  /**
   * 
   * @param {Interaction} interaction 
   * @param {string} fileName 
   * @returns {Creature} 
   */
  getCreatureFromFileName(interaction, fileName){
    fileName = module.exports.fixOGG(module.exports.stripAsterisk(fileName));
    let sound = interaction.client.bosstalk.sounds.find(s => module.exports.getFileNameFromFilePath(s.filePath, true) == fileName);
    let sounds = module.exports.getSoundsFromCreatureName(interaction, sound.creatureName);
    return new Creature(sound.creatureName, sounds);
  },
  getSoundIndexFromFileName(creature, fileName){
    fileName = module.exports.fixOGG(module.exports.stripAsterisk(fileName));
    let filePath = module.exports.getFilePathFromFileName(creature.name,fileName)
    return creature.sound.findIndex(s => s.filePath == filePath)
  }
  ,
  fixOGG(str){
    if(!str.endsWith(".ogg")){
      return str + ".ogg";
    }
    else{
      return str;
    }
  },
  stripAsterisk(str){
    return str.replaceAll('*', '');
  },
  async playFile(interaction, filePath){
    const connection = getVoiceConnection(interaction.guild.id);
    if(!connection) return;
    if(!connection.state.subscription){
      logger.verbose("no subscription found, creating player and subscribing this voice connection to it")
      connection.subscribe(createAudioPlayer());
    }
    const resource = createAudioResource(filePath);
    connection.state.subscription.player.play(resource);
    interaction.client.bosstalk.stats.playedSound(interaction, filePath);
  },
  async playCreature(interaction, {sounds, random = false}, soundIndex=0) {
    const sound = random ? module.exports.getRandomSoundFromCreature(interaction, creature) : sounds[parseInt(soundIndex)];
    module.exports.playFile(interaction, sound.filePath);
    return sound;
  },
  /**
   * @deprecated
   * @param {*} message 
   * @param {*} creature 
   * @returns the sound
   */
  getRandomSoundFromCreature(message,creature){
    if(!message.client.bosstalk.creatureSounds.has(creature.name)){
      logger.error("playRandomSoundFromCreature was passed an invalid creature name");
    }
    sounds = message.client.bosstalk.creatureSounds.get(creature.name).sounds;
    sound = sounds[Math.floor(Math.random()*sounds.length)];
    return sound;
  },
  getSoundsFromCreatureName(interaction, creatureName){
    return interaction.client.bosstalk.sounds.filter((s) => s.creatureName == creatureName);
  },
  /**
   * @description Takes an array of tag objects and returns the sound data associated with them.
   * @param {Discord.interaction} interaction 
   * @param {Tag[]} tags 
   * @returns 
   */
  attachSoundstoTags(tags, sounds){
    //Pretty slow :( 50ms or so
    //Convert array of sounds to map with key=filePath
    let soundsByFilePath = new Map();
    for (const sound of sounds){
      soundsByFilePath.set(sound.filePath, sound);
    }

    
    let tagSounds = tags.map((t) => {
      t.sound = soundsByFilePath.get(t.filePath);
      return t;
    });
    return tagSounds;
  },
  tagSort(a,b){
    const tagA = a.tag.toUpperCase(); // ignore upper and lowercase
    const tagB = b.tag.toUpperCase(); // ignore upper and lowercase
    if (tagA < tagB) {
      return -1;
    }
    if (tagA > tagB) {
      return 1;
    }
  
    // names must be equal
    return 0;
  },
  time(fn, name){
    return (...args) => {
        const _startTime = performance.now()
        res = fn(...args)
        const _endTime = performance.now()
        logger.info(`Call ${name} took ${_endTime - _startTime} milliseconds`)
        return res;
    }
  }
};