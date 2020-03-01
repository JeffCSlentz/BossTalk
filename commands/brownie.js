module.exports = {
    name: 'brownie',
    description: 'Get information about the BROWNIE POINT LEADERBOARD ( ͡° ͜ʖ ͡°)',
    usage: 'none/[user]',
    guildOnly: false,
    authorOnly: true,
    execute(message, args) {
      let data = [];

      //If in a dm
      if(!message.guild){
        if(message.client.browniePoints.has(message.author.id)){
          data.push(`You have ${message.client.browniePoints.get(message.author.id)} brownie points! Way to go! (●´ω｀●)`);
        }
        else{
          data.push(`You have no brownie points. (◕︵◕) Get some!`);
        }

        return message.channel.send(data);
      }

      //If no arguments
      if (!args.length){
        data.push(`(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧   BROWNIE LEADERBOARD   ﾍ(￣▽￣*)ﾉ`)

        let br = Array.from(message.client.browniePoints);
        br.sort((a,b) => (parseInt(b[1]) - parseInt(a[1])));
        for(const user of br){
          if (message.guild.members.has(user[0])){
            data.push(`${message.guild.members.get(user[0]).user.username}: ${message.client.browniePoints.get(user[0])}`);
          }
        }
        return message.channel.send(data);
      }
      //else if no mentions
      else if (!message.mentions.users.array().length) {
        data.push(`Try mentioning somebody.`)
        return message.channel.send(data);
      }
      else{
        if (message.client.browniePoints.has(message.mentions.users.first().id)){
          data.push(`${message.mentions.users.first().username} has ${message.client.browniePoints.get(message.mentions.users.first().id)} brownie points! JEALOUS?`);
        }
        else{
          data.push(`I don't think they have any brownie points. Lazy bums! (￣。￣)～ｚｚｚ `);
        }
        return message.channel.send(data);
      }
    },
};
