module.exports = {
    name: 'leave',
    description: 'Leave any voice channel I\'m in',
    guildOnly: true,
    authorOnly: false,
    inVoiceOnly: true,
    execute(message, args) {
      connection = message.client.voiceConnections.get(message.guild.id);
      channelName = connection.channel.name;
      connection.disconnect();
      return message.channel.send(`Left ${channelName}.`);
    },
};
