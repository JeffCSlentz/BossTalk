const { prefix } = require('../config.json');
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
      let channelReply = "";

      if (!args.length) {
        channelReply = 'I\'ve sent you a DM with all my commands!'
        data.push('Here\'s a list of all my commands:');
        listOfCommands = commands.map(command => (validator.helpMessageValidate(message, args, command)?command.name:null))
        console.log(listOfCommands);
        data.push(listOfCommands.join(', '));
        data.push(`\nYou can send \`${prefix}help [command name]\` to get info on a specific command!`);
      }
      else {
        if (!commands.has(args[0])) {
            return message.reply('that\'s not a valid command!');
        }
        const command = commands.get(args[0]);
        channelReply = `I sent you a DM about ${args[0]}!`;
        data.push(`**Name:** ${command.name}`);
        if (command.description) data.push(`**Description:** ${command.description}`);
        if (command.aliases) data.push(`**Aliases:** ${command.aliases.join(', ')}`);
        if (command.usage) data.push(`**Usage:** ${prefix}${command.name} ${command.usage}`);
        if (command.cooldown) data.push(`**Cooldown:** ${command.cooldown} second(s)`);
      }

      message.author.send(data, { split: true })
          .then(() => {
              if (message.channel.type !== 'dm') {
                  message.channel.send(channelReply);
              }
          })
          .catch(() => message.reply('it seems like I can\'t DM you!'));

    },
};
