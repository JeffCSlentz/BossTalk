module.exports = {
    name: 'volume',
    description: 'Set the volume of playback.',
    usage: '[0-1]',
    guildOnly: true,
    authorOnly: false,
    execute(message, args) {
      if (!args.length || args[0] < 0 || args[0] > 1) {
        return message.channel.send(`Choose a volume between 0 and 1, ${message.author}!`);
      }
      else{
        message.client.volume = args[0];
        return message.channel.send(`Set volume to ${args[0]}.`);
      }
    },
};
