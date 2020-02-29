module.exports = {
    name: 'leave',
    description: 'Leave any voice channel I\'m in',
    guildOnly: true,
    execute(message, args) {
      //if (!message.guild) return;
      if (message.guild.available){
        let left = false;
        const connections = message.client.voiceConnections.array();

        for(var value of connections){
          value.channel.leave();
          left = true;
          console.log(`Left ${value.channel.name}.`)
          return message.channel.send(`Left ${value.channel.name}.`);
        }

        if (!left){
          return message.channel.send(`I don't think i'm in a channel (´･ω･\`)`);
        }
      }
    },
};
