const rewardNames = Object.keys(require('./../data/rewardsData.js').rewards)
const rewards = require('./../data/rewardsData.js').rewards;
const utility = require('./../utility/utility.js');
const logger = require('./../utility/logger.js').logger;
const { getVoiceConnection, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');

module.exports = {
    name: 'play',
    description: 'Play a sound!',
    usage: '[expansion] OR [dungeon] OR [creature] OR [soundID]',
    guildOnly: true,
    authorOnly: false,
    inVoiceOnly: true,
    execute(message, args) {
      if(!args.length) return;
      if(getVoiceConnection(message.guild.id).state.subscription && !(getVoiceConnection(message.guild.id).state.subscription.player.state.status == AudioPlayerStatus.Idle)){
        return message.channel.send(`I'm already playing a sound! Wait thx`)
      }

      //If it's a reward
      if (rewardNames.includes(args[0])){
        rewardName = args[0]
        browniePoints = utility.GetAlwaysFromCollection(message.client.browniePoints, message.author.id, 0);
        neededBP = rewards[rewardName];
        if(browniePoints >= neededBP){
          const fileName = `./sounds/rewards/${rewardName}.ogg`;
          playFile(message, fileName); //This is awk
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
        sound = message.client.allSounds.get(soundID)
        playFile(message, sound.filePath);
        return message.channel.send(stringSound(message, sound));
      }

      //If it's a tag.
      const tags = message.client.guildTags.get(message.guild.id) || {};  //Get the tags object from the guild ID.
      soundFilePaths = tags[args[0]] || []; //If the tag has soundFilePaths, get them. Otherwise return empty list.
      if(soundFilePaths.length){
        const soundFilePath = soundFilePaths[Math.floor(Math.random()*soundFilePaths.length)];
        let sound = message.client.filePathSounds.get(soundFilePath);
        playFile(message, sound.filePath);
        return message.channel.send(stringSound(message, sound));
      }

      //If it's a creature.
      if(message.client.creatureSounds.has(args[0])){
        sound =  getRandomSoundFromCreature(message, args[0]);
        playFile(message, sound.filePath);
        return message.channel.send(stringSound(message, sound));
      }

      //If it's a location.
      for (const valueKey of Array.from(message.client.categorySounds.entries())){
        let expansion = valueKey[0]; //String
        let locations = valueKey[1]; //Discord.js Collection
        if(locations.has(args[0])){
          let creatureNames = Array.from(locations.get(args[0]));
          creatureName = creatureNames[Math.floor(Math.random()*creatureNames.length)]
          sound = getRandomSoundFromCreature(message, creatureName);
          playFile(message, sound.filePath);
          return message.channel.send(stringSound(message, sound));
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
        sound = getRandomSoundFromCreature(message, creatureName);
        playFile(message, sound.filePath);
        return message.channel.send(stringSound(message, sound));
      }

      //If it's not an integer.
      if (!Number.isInteger(parseInt(args[0]))){
        helpText = `I don't recognize **${args[0]}** as a tag, creature, location, expansion, soundID, or command, ${message.author}! (◕﹏◕✿).`;
        return message.channel.send(helpText);
      }

      //It's an integer.
      soundID = parseInt(args[0]);
      if (message.client.allSounds.has(soundID)){
        playFile(message, message.client.allSounds.get(soundID).filePath);
        return message.channel.send(stringSound(message, message.client.allSounds.get(soundID)));
      }
      else{
        return message.channel.send(`I don't have that many sounds! (´･ω･\`)`);
      }
    },
};

function playFile(message, filePath){
  //const connection = message.guild.voice.connection
  //const connection = getVoiceConnection(message.member.voice.channel.guild.id);
  const connection = getVoiceConnection(message.guild.id);
  if(!getVoiceConnection(message.guild.id).state.subscription){
    console.log("no subscription found, creating player and subscribing this voice connection to it")
    connection.subscribe(createAudioPlayer())
  }

  const resource = createAudioResource(filePath);
  
  connection.state.subscription.player.play(resource)
  

  connection.state.subscription.player.on(AudioPlayerStatus.Playing, () => {
    console.log("Player has started!")
  });

  connection.state.subscription.player.on(AudioPlayerStatus.Idle, () => {
    console.log("Player has stopped!")
  });



  //const dispatcher = connection.play(filePath);
  message.client.provider.stats.playedSound(message, filePath);
  //dispatcher.setVolume(message.client.provider.getGuildProperty(message.guild, "volume"));
  //dispatcher.on(`start`, () => {
     //connection.player.streamingData.pausedTime = 0;
  //});
  logger.info(`Played ${filePath} after ${Date.now() - message.client.messageReceivedTime.getTime()} ms.`);
  //message.channel.send(stringSound(message, sound));
}

function getRandomSoundFromCreature(message,creatureName){
  if(!message.client.creatureSounds.has(creatureName)){
    logger.error("playRandomSoundFromCreature was passed an invalid creature name");
  }
  sounds = message.client.creatureSounds.get(creatureName).sounds;
  sound = sounds[Math.floor(Math.random()*sounds.length)];
  return sound;
}

function stringSound(message, sound){
  let data = '';
  data += (`**${sound.creatureName}**: \`${sound.id}\`` + " ".repeat(10))
  if (sound.position.expansion== ""){
    data += `**Expansion**: \`unknown\``;
  }
  else{
    data += `**Expansion**: \`${sound.position.expansion}\``;
    if (sound.position.location == ""){
      data += `   **Location**: \`unknown\``
    }
    else{
      data += `   **Location**: \`${sound.position.location}\``
    }
  }
  return data;
}
