module.exports = {
    name: 'tags',
    description: 'Get a list of tags.',
    guildOnly: true,
    execute(message, args) {
      //If not in a guild, return;
      if(!message.guild) return;

      const tags = message.client.guildTags.get(message.guild.id) || {};

      data = []
      data.push(`**Tags**`);
      let listOfTags = Object.keys(tags).sort();

      data.push(`${listOfTags.join(`, `)}`);
      return message.channel.send(data);
    },
};
