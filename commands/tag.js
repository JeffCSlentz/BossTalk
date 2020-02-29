const dataManip = require('./../utility/dataManipulation.js');

module.exports = {
    name: 'tag',
    description: 'Tag a sound with a special word to be used with !play',
    usage: '[soundNumber] [tag]',
    guildOnly: true,
    async execute(message, args) {
      //If not enough arguments, return.
      if (args.length < 2) {
        return message.channel.send('Include [soundNumber] [tag]');
      }

      //If soundID not found, return.
      if(!message.client.allSounds.has(parseInt(args[0]))){
        return message.channel.send(`I couldn't find that sound.`)
      }

      //Get arguments from user's message.
      const soundID = parseInt(args[0]);
      const tag = args[1];

      //Gets guilds tags.
      const tags = message.client.guildTags.get(message.guild.id) || {};


      //Gets list of sounds that has this tag.
      let sounds = tags[tag] || [];
      console.log(message.client.allSounds.get(soundID));
      sounds.push(message.client.allSounds.get(soundID).filePath);

      //Since sounds could be an empty list, not assigned to tags, reassign it.
      tags[tag] = sounds;
      console.log("\n\ntag.js 45:")
      console.log(tags);

      console.log(`tag.js 53: Added ${soundID} to ${tag}. This tag has sounds ${tags[tag]}`);
      message.client.guildTags.set(message.guild.id, tags);

      dataManip.AddBrowniePoints(message, 5);
      return message.channel.send(`Thanks for adding sound ${soundID} to ${tag}! You get 5 brownie points. ◕ ◡ ◕`);
    },
};
