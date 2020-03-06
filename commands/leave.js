module.exports = {
    name: 'leave',
    description: 'Leave any voice channel I\'m in',
    guildOnly: true,
    authorOnly: false,
    inVoiceOnly: true,
    execute(message, args) {
      channelName = message.guild.voice.connection.channel.name;
      message.guild.voice.connection.disconnect();
      return message.channel.send(`Left ${channelName}.`);
    },
};
