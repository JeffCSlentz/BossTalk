const dataManip = require('../utility/dataManipulation.js');

module.exports = {
    name: 'prefix',
    description: 'Change my prefix. Only available to administrators.',
    guildOnly: true,
    authorOnly: false,
    adminOnly: true,
    execute(message, args) {
        if(!args.length){
            return message.channel.send([`My current prefix is ${message.client.provider.getGuildProperty(message.guild, "prefix")}`, `But you already knew that ;)`])
        }
        message.client.provider.setGuildProperty(message.guild, "prefix", args[0])
        //dataManip.writeDiscordCollectionToJSON(message.client.guildData, './data/guildData.json')
        return message.channel.send(`Ok, I set my prefix to ${args[0]}`);
    }
};
