const rewardNames = Object.keys(require('./../data/rewardsData.js').rewards)
const rewards = require('./../data/rewardsData.js').rewards;
const utility = require('./../utility/utility.js');
const logger = require('./../utility/logger.js').logger;
module.exports = {
    name: 'play',
    description: 'Play a sound!',
    usage: '[expansion] OR [dungeon] OR [creature] OR [soundID]',
    guildOnly: true,
    authorOnly: false,
    inVoiceOnly: true,
    execute(message, args) {
      if(!args.length) return;
      if(message.guild.voice.connection.speaking == true){
        return message.channel.send(`I'm already playing a sound! Wait thx`)
      }

      //If it's a reward
      if (rewardNames.includes(args[0])){
        rewardName = args[0]
        browniePoints = utility.GetAlwaysFromCollection(message.client.browniePoints, message.author.id, 0);
        neededBP = rewards[rewardName];
        if(browniePoints >= neededBP){
          const fileName = `./sounds/rewards/${rewardName}.ogg`;
          playSound(message, {fileName:fileName});
          return message.channel.send(`SPECIAL SOUND ALERT! BWAAA BWAA BWAAAAA`);
        }
      }

      // guildTags
      // type: Collection
      // <guild snowflake, tags>
      //
      // tags
      // type: Collection
      // <tag name, [soundIDs]>

      //If it's random
      if (args[0] == "random" || args[0] == "rand" || args[0] == 'r'){
        soundID = Math.floor(Math.random() * message.client.numSounds) + 1;
        return playSound(message, message.client.allSounds.get(soundID));
      }

      //If it's a tag.
      const tags = message.client.guildTags.get(message.guild.id) || {};  //Get the tags object from the guild ID.
      soundFilePaths = tags[args[0]] || []; //If the tag has soundFilePaths, get them. Otherwise return empty list.

      if(soundFilePaths.length){
        const soundFilePath = soundFilePaths[Math.floor(Math.random()*soundFilePaths.length)];
        let sound = message.client.filePathSounds.get(soundFilePath);
        return playSound(message, sound);
      }

      //If it's a creature.
      if(message.client.creatureSounds.has(args[0])){
        return playRandomSoundFromCreature(message, args[0]);
      }

      //If it's a location.
      for (const valueKey of Array.from(message.client.categorySounds.entries())){
        let expansion = valueKey[0]; //String
        let locations = valueKey[1]; //Discord.js Collection
        if(locations.has(args[0])){
          let creatureNames = Array.from(locations.get(args[0]));
          creatureName = creatureNames[Math.floor(Math.random()*creatureNames.length)]
          return playRandomSoundFromCreature(message, creatureName);
        }
      }

      //If it's an expansion
      if(message.client.categorySounds.has(args[0])){
        locationCollection = message.client.categorySounds.get(args[0]); //key=LOCATION_NAME, val=set(CREATURE_NAMES)
        creatureNames = []
        for(creatureSet of locationCollection.values()){
          creatureNames.push(...Array.from(creatureSet.values()));
        }
        creatureName = creatureNames[Math.floor(Math.random()*creatureNames.length)]
        return playRandomSoundFromCreature(message, creatureName);
      }

      //If it's not an integer.
      if (!Number.isInteger(parseInt(args[0]))){
        helpText = `I don't recognize **${args[0]}** as a tag, creature, location, expansion, soundID, or command, ${message.author}! (◕﹏◕✿).`;
        return message.channel.send(helpText);
      }

      //It's an integer.
      soundID = parseInt(args[0]);
      if (message.client.allSounds.has(soundID)){
        return playSound(message, message.client.allSounds.get(soundID));
      }
      else{
        return message.channel.send(`I don't have that many sounds! (´･ω･\`)`);
      }
    },
};

function playSound(message, sound){
  const connection = message.guild.voice.connection
  const dispatcher = connection.play(sound.filePath);
  message.client.provider.stats.playedSound(message, sound.filePath);
  dispatcher.setVolume(message.client.provider.getGuildProperty(message.guild, "volume"));
  dispatcher.on(`start`, () => {
     //connection.player.streamingData.pausedTime = 0;
  });
  logger.info(`Played ${sound.filePath} after ${Date.now() - message.client.messageReceivedTime.getTime()} ms.`);
  return message.channel.send(stringSound(message, sound));
}

function playRandomSoundFromCreature(message,creatureName){
  if(!message.client.creatureSounds.has(creatureName)){
    logger.error("playRandomSoundFromCreature was passed an invalid creature name");
  }
  sounds = message.client.creatureSounds.get(creatureName).sounds;
  console.log(sounds);
  sound = sounds[Math.floor(Math.random()*sounds.length)];
  return playSound(message, sound);
}

function stringSound(message, sound){
  let data = [];
  data.push(`Creature: ${sound.creatureName}, ${sound.id}.`);
  if (message.client.creatureSounds.get(sound.creatureName).positions[0].expansion == ""){
    data.push(`Type !update [creature] [expansion] [location (dungeon or raid name? world?)] to suggest a location for this creature!`)
  }
  return data;
}
