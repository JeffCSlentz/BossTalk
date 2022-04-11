const validator = require('../utility/validator.js')

module.exports = {
    name: 'help',
    description: 'List all of my commands or info about a specific command.',
    aliases: ['commands'],
    usage: '[command name]',
    guildOnly: false,
    authorOnly: false,
    cooldown: 5,
    execute(message, args) {
      const { commands } = message.client;
      const data = [];

      if (!args.length) {
        data.push('Here\'s a list of all my commands available to you:');
        listOfCommands = commands.map(command => (validator.helpMessageValidate(message, args, command)?command.name:null));
        listOfCommands = listOfCommands.filter(command => command); //Remove nulls
        data.push(listOfCommands.join('    '));
        data.push(`\nYou can send \`!help [command name]\` to get info on a specific command!`);
      }
      else {
        if (!commands.has(args[0])) {
          return message.reply('that\'s not a valid command!');
        }
        else if (!validator.helpMessageValidate(message, args, commands.get(args[0]))){
          return message.reply('That command is not available to you.');
        }
        const command = commands.get(args[0]);
        channelReply = `I sent you a DM about ${args[0]}!`;
        data.push(`**Name:** ${command.name}`);
        if (command.description) data.push(`**Description:** ${command.description}`);
        if (command.aliases) data.push(`**Aliases:** ${command.aliases.join(', ')}`);
        if (command.usage) data.push(`**Usage:** ${message.client.provider.getGuildProperty(message.guild, "prefix")}${command.name} ${command.usage}`);
        if (command.cooldown) data.push(`**Cooldown:** ${command.cooldown} second(s)`);
      }

      return message.channel.send(data.join("\n"));

    },
};
