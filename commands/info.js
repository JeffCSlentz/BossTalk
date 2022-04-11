const s = require('./../utility/search.js');
const utility = require('./../utility/utility.js');

module.exports = {
    name: 'info',
    description: 'Get information about an expansion, location, creature, or sound.',
    usage: '[expansion/location/creature/soundID]',
    guildOnly: false,
    authorOnly: false,
    execute(message, args) {
      if (!args.length){
        return message.channel.send('Get information about an expansion, location, creature, or sound.');
      } else {
        let data = s.search(message, args);
        if(data.header.length > 0){
          message.channel.send(data.header.join("\n"))
        }
        if(data.content.length > 0){
          //HANDLE BIG RESULTS
          let tempdata = []
          for (const item of data.content){
            tempdata.push(item)
            if (utility.listOfStringsLength(tempdata) > 1800){
              tempdata.unshift(`\`\`\``);
              tempdata.push(`\`\`\``);
              message.channel.send(tempdata.join("\n"));
              tempdata = [];
            }
          }
          if (tempdata.length > 0) {
            tempdata.unshift(`\`\`\``);
            tempdata.push(`\`\`\``);
            message.channel.send(tempdata.join("\n"));
          }
        }
        return
      }
    },
};