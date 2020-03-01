const dataManip = require('../utility/dataManipulation.js');

module.exports = {
    name: 'prefix',
    description: 'Change my prefix. Only available to administrators.',
    guildOnly: true,
    authorOnly: false,
    adminOnly: true,
    execute(message, args) {
        if(!args.length){
            return message.channel.send([`My current prefix is ${message.client.getPrefix(message)}`, `But you already knew that ;)`])
        }
        message.client.setPrefix(message, args[0]);
        console.log(message.client.guildData.get(message.guild.id))
        dataManip.writeDiscordCollectionToJSON(message.client.guildData, './data/guildData.json')
        return message.channel.send(`Ok, I set my prefix to ${args[0]}`);
    }
};
