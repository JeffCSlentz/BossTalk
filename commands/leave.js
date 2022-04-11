const { getVoiceConnection } = require('@discordjs/voice');

module.exports = {
    name: 'leave',
    description: 'Leave any voice channel I\'m in',
    guildOnly: true,
    authorOnly: false,
    inVoiceOnly: true,
    execute(message, args) {
      getVoiceConnection(message.guild.id).destroy();
      return message.channel.send(`Left voice channel.`);
    },
};
