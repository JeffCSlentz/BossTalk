module.exports = {
    name: 'stats',
    description: "Find out about Bosstalk's stats!",
    guildOnly: false,
    authorOnly: false,
    execute(message, args) {
        let stats = message.client.provider.stats;
        stats.updateNumberOfSounds(message);
        return message.channel.send(stats.getStatsMessage());
    }
};
