module.exports = {
    name: 'join',
    description: 'Join a specific channel',
    usage: '[channel name/ID]',
    guildOnly: true,
    authorOnly: false,
    execute(message, args) {
      //Attempt to join the user's channel
      if(!args.length && message.member.voice && message.member.voice.channel){
        message.member.voice.channel.join();
        return message.channel.send(`Joined ${message.member.voice.channel.name}`);
      }

      //If no args and user not in a channel
      if (!args.length && !message.member.voice) {
        return message.channel.send(`Provide or join a channel, ${message.author}!`);
      }

      //Joins the provided channel ID
      if(message.guild.channels.cache.has(args[0])){
        message.guild.channels.cache.get(args[0]).join();
        return message.channel.send(`Joined ${message.guild.channels.cache.get(args[0]).name}`);
      }

      //Joins the provided channel name
      const channels = message.guild.channels.cache.array();
      for (var value of channels) {
        if(value.type === 'voice'&& value.name === args.join(' ')){
          value.join();
          return message.channel.send(`Joined ${args.join(' ')}!`);
        }
      }
      return message.channel.send(`I couldn't find a channel named '${args[0]}', ${message.author}!`);
    },
};
