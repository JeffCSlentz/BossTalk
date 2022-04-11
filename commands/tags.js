module.exports = {
    name: 'tags',
    description: 'Get a list of tags.',
    guildOnly: true,
    authorOnly: false,
    execute(message, args) {
      const tags = message.client.guildTags.get(message.guild.id) || {};

      data = []
      data.push(`**Tags**`);
      let listOfTags = Object.keys(tags).sort();

      data.push(`${listOfTags.join(`, `)}`);
      return message.channel.send(data.join("\n"));
    },
};
