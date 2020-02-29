const rewardNames = Object.keys(require('./../data/rewardsData.js').rewards)
const rewards = require('./../data/rewardsData.js').rewards;
const utility = require('./../utility/utility.js');
const Discord = require('discord.js');

module.exports = {
    name: 'play',
    description: 'Play a sound!',
    usage: '[expansion] [dungeon] [boss] [number]',
    guildOnly: true,
    execute(message, args) {
      if(!message.guild) return;
      if(!args.length) return;
      if(!message.client.voiceConnections.has(message.guild.id)){
        return message.channel.send(`I can't play sounds if i'm not in a channel (´･ω･\`)`);
      }

      //If it's a reward
      if (rewardNames.includes(args[0])){
        rewardName = args[0]
        browniePoints = utility.GetAlwaysFromCollection(message.client.browniePoints, message.author.id, 0);
        neededBP = rewards[rewardName];
        console.log(neededBP)
        console.log(rewardNames)
        if(browniePoints >= neededBP){
          const fileName = `./sounds/rewards/${rewardName}.ogg`;
          PlayFile(message, fileName);
          return message.channel.send(`SPECIAL SOUND ALERT! BWAAA BWAA BWAAAAA`);
        }
        else{
          return message.channel.send(`You don't have enough brownie points (◕︵◕)`)
        }
      }

      // guildTags
      // type: Collection
      // <guild snowflake, tags>
      //
      // tags
      // type: Collection
      // <tag name, [soundIDs]>

      //If it's a tag.
      const tags = message.client.guildTags.get(message.guild.id) || {};  //Get the tags object from the guild ID.
      soundFilePaths = tags[args[0]] || []; //If the tag has soundFilePaths, get them. Otherwise return empty list.

      if(soundFilePaths.length){
        const soundFilePath = soundFilePaths[Math.floor(Math.random()*soundFilePaths.length)];
        let sound = message.client.filePathSounds.get(soundFilePath);
        PlayFile(message, sound.filePath);
        return message.channel.send(stringSound(message, sound));
      }

      //Determine soundID or give an error.
      let soundID = 0;
      if (args[0] == "random" || args[0] == "rand" || args[0] == 'r'){
        soundID = Math.floor(Math.random() * message.client.numSounds) + 1;
      } else if (!Number.isInteger(parseInt(args[0]))){
          return message.channel.send(`I don't recognize that tag or soundID, ${message.author}! (◕﹏◕✿)`);
      }
      else {
        soundID = parseInt(args[0]);
      }

      //If it's a sound ID
      if (message.client.allSounds.has(soundID)){

        let sound = message.client.allSounds.get(soundID)
        const fileName = sound.filePath;

        PlayFile(message, fileName);
        return message.channel.send(stringSound(message, sound));
      }
      else{
        return message.channel.send(`I don't have that many sounds! (´･ω･\`)`);
      }
    },
};

function PlayFile(message, fileName){

  console.log(`Played ${fileName} after ${Date.now() - message.client.tempTime} ms.`);
  const connection = message.client.voiceConnections.get(message.guild.id);
  console.log(`Paused Time: ${connection.player.streamingData.pausedTime}`);


  const dispatcher = connection.playFile(fileName);
  dispatcher.setVolume(message.client.volume); // Set the volume to client.volume
  dispatcher.on(`start`, () => {
     connection.player.streamingData.pausedTime = 0;
  });
  console.log(`Played sound ${fileName}`);
}

function stringSound(message, sound){
  let data = [];
  data.push(`Creature: ${sound.creatureName}, ${sound.id}.`);
  if (message.client.creatureSounds.get(sound.creatureName).positions[0].expansion == ""){
    data.push(`Type !update [creature] [expansion] [location (dungeon or raid name? world?)] to give this creature a home and win some brownie points!`)
  }
  return data;
}
