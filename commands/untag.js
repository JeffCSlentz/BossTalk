module.exports = {
    name: 'untag',
    description: 'Untag a sound or tag',
    usage: '[soundID/tag]',
    guildOnly: true,
    execute(message, args) {
      //If not in a guild, return;
      //if(!message.guild) return;

      //It needs at least one argument.
      if (!args.length) {
        return;
      }

      //If the first argument is a tag.
      const tags = message.client.guildTags.get(message.guild.id) || {};
      sounds = tags[args[0]] || []; //If the tag has sounds, get them. Otherwise return empty list.

      if(sounds.length){ //If a tag was found, sounds will have entries.
        let soundIDs = tags[args[0]];
        //let soundIDs = sounds.map(sound => sound.id);
        let data = ``;
        if (soundIDs.length == 1){
          data = `Removed sound ${soundIDs.join(`, `)} from ${args[0]}.`;
        } else {
          data = `Removed sounds ${soundIDs.join(`, `)} from ${args[0]}.`;
        }

        delete tags[args[0]];
        message.client.guildTags.set(message.guild.id, tags);

        return message.channel.send(data);
      }

      //If the first argument is not an integer.
      if (!Number.isInteger(parseInt(args[0]))){
        return message.channel.send(`I don't recognize that tag, ${message.author}! (◕﹏◕✿)`);
      }

      let soundID = parseInt(args[0]);
      if (message.client.allSounds.has(soundID)){

        tempObject = {};

        for(tagAndSounds of Object.entries(tags)){
          let tag = tagAndSounds[0];
          let sounds = tagAndSounds[1];

          if (sounds.includes(parseInt(args[0]))){
            if(sounds.length == 1){
              delete tags[tag];
            } else {
              soundIndex = sounds.indexOf(args[0]);
              sounds.splice(soundIndex, 1);
            }

            message.client.guildTags.set(message.guild.id, tags);
            return message.channel.send(`Removed ${args[0]} from ${tag}.`);
          }
        }
        return message.channel.send(`I don't think that soundID is tagged. (´･ω･\`)`);
      }
      else{
        return message.channel.send(`I don't have that many sounds! (´･ω･\`)`);
      }
      return message.channel.send();
    },
};
