module.exports = {
    name: 'brownie',
    description: 'Get information about the BROWNIE POINT LEADERBOARD ( ͡° ͜ʖ ͡°)',
    usage: 'none/[@user]',
    guildOnly: false,
    authorOnly: true,
    execute(message, args) {
      let data = [];

      //If in a dm
      if(!message.guild){
        if(message.client.browniePoints.has(message.author.id)){
          return message.channel.send(`You have ${message.client.browniePoints.get(message.author.id)} brownie points! Way to go! (●´ω｀●)`);
        }
        else{
          return message.channel.send(`You have no brownie points. (◕︵◕) Get some!`);
        }
      }

      //If no arguments
      if (!args.length){
        data.push(`(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧   BROWNIE LEADERBOARD   ﾍ(￣▽￣*)ﾉ`)
        let br = Array.from(message.client.browniePoints); //key[0] = userid, val[1] = browniepoints
        br.sort((a,b) => (parseInt(b[1]) - parseInt(a[1])));

        longestNameLength = 0;
        longestScoreLength = 0;
        for(const user of br){
          if (message.guild.members.cache.has(user[0])){
            if (user[0].user.username.length > longestNameLength){
              longestNameLength = user[0].user.username.length
              
            }
            if (longestScoreLength > user[1].toString().length){
              longestScoreLength = user[1].toString().length
            }
          }
        }
        gap = longestNameLength + 4
        for(const user of br.slice[0,10]){
          if (message.guild.members.cache.has(user[0])){
            let numSpaces = gap - user[0].user.username.length + (user[1].toString().length - longestScoreLength)
            data.push(`${message.guild.members.cache.get(user[0]).user.username}` + ` `.repeat(numSpaces) `${user[1]}`);
          }
        }
        if(br.length > 10){
          data.push(`and ${br.length - 10} others.`)
        }
        return message.channel.send(data.join("\n"));
      }
      //else if no mentions
      else if (!message.mentions.users.array().length) {
        data.push(`Try mentioning somebody.`)
        return message.channel.send(data.join("\n"));
      }
      else{
        if (message.client.browniePoints.has(message.mentions.users.first().id)){
          data.push(`${message.mentions.users.first().username} has ${message.client.browniePoints.get(message.mentions.users.first().id)} brownie points! JEALOUS?`);
        }
        else{
          data.push(`I don't think they have any brownie points. Lazy bums! (￣。￣)～ｚｚｚ `);
        }
        return message.channel.send(data.join("\n"));
      }
    },
};
