module.exports = {
    name: 'join',
    description: 'Join a specific channel',
    usage: '[channel name/ID]',
    guildOnly: true,
    execute(message, args) {
      if (!message.guild) return;
      if (message.guild.available){
        //Attempt to join the user's channel
        if(!args.length && message.member.voiceChannel){
          const connection = message.member.voiceChannel.join();
          return message.channel.send(`Joined ${message.member.voiceChannel.name}`);
        }

        //If no args or user not in a channel
        if (!args.length && !message.member.voiceChannel) {
          return message.channel.send(`Provide or join a channel, ${message.author}!`);
        }

        //Joins the provided channel ID
        if(message.guild.channels.has(args[0])){
          message.guild.channels.get(args[0]).join();

          console.log(`Joined ${message.guild.channels.get(args[0]).name}`);
          return message.channel.send(`Joined ${message.guild.channels.get(args[0]).name}`);
        }

        //Joins the provided channel name
        const channels = message.guild.channels.array();
        for (var value of channels) {
          if(value.type === 'voice'&& value.name === args.join(' ')){
            value.join();
            console.log(`Joined ${args.join(' ')}!`)
            return message.channel.send(`Joined ${args.join(' ')}!`);
          }
        }

        return message.channel.send(`I couldn't find a channel named '${args[0]}', ${message.author}!`);
      }
    },
};
