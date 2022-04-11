const { joinVoiceChannel } = require('@discordjs/voice');

module.exports = {
    name: 'join',
    description: 'Join the voice channel you\'re in.',
    usage: '[channel name/ID]',
    guildOnly: true,
    authorOnly: false,
    execute(message, args) {
      //Attempt to join the user's channel
      if(!args.length && message.member.voice && message.member.voice.channel){
        const connection = joinVoiceChannel({
          channelId: message.member.voice.channel.id,
          guildId: message.member.voice.channel.guild.id,
          adapterCreator: message.member.voice.channel.guild.voiceAdapterCreator,
        });
        connection.subscribe(createAudioPlayer())
        return message.channel.send(`Joined ${message.member.voice.channel.name}`);
      }

      //If no args and user not in a channel
      if (!args.length && !message.member.voice) {
        return message.channel.send(`Provide or join a channel, ${message.author}!`);
      }
      /*
      //Joins the provided channel ID
      if(message.guild.channels.cache.has(args[0])){
        //message.guild.channels.cache.get(args[0]).join();
        const connection = joinVoiceChannel({
          channelId: args[0],
          guildId: message.guild.id,
          adapterCreator: message.guild.voiceAdapterCreator,
        });
        return message.channel.send(`Joined ${message.guild.channels.cache.get(args[0]).name}`);
      }

      //Joins the provided channel name
      const channels = message.guild.channels.cache.array();
      for (var value of channels) {
        if(value.type === 'voice'&& value.name === args.join(' ')){
          //value.join();
          const connection = joinVoiceChannel({
            channelId: value.id,
            guildId: message.member.voice.channel.guild.id,
            adapterCreator: message.member.voice.channel.guild.voiceAdapterCreator,
          });
          return message.channel.send(`Joined ${args.join(' ')}!`);
        }
      }
      return message.channel.send(`I couldn't find a channel named '${args[0]}', ${message.author}!`);
      */
    },
};
