const rewardNames = Object.keys(require('./../data/rewardsData.js').rewards);

module.exports = {
    name: 'rewards',
    description: 'Find out about rewards!',
    guildOnly: false,
    authorOnly: false,
    execute(message, args) {
      if (message.guild.available){
        data = [];

        let browniePoints = 0;
        if(message.client.browniePoints.has(message.author.id)){
          browniePoints = message.client.browniePoints.get(message.author.id);
        }

        for (const name of rewardNames){
          let number = rewardNames[name];
          let aString = `${number}: `;
          aString = aString.concat(name);

          data.push(aString);
        }

        let channelReply = `You should have a DM about some DANK brownie rewards.`

        message.author.send(data, { split: true })
            .then(() => {
                if (message.channel.type !== 'dm') {
                    message.channel.send(channelReply);
                }
            })
            .catch(() => message.reply('It seems like I can\'t DM you!'));

      }
    },
};
