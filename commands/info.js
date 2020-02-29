const s = require('./../utility/search.js');
module.exports = {
    name: 'info',
    description: 'Get information about an expansion, location, creature, or sound.',
    usage: '[expansion/location/creature/soundID]',
    execute(message, args) {
      if (!args.length){
        return message.channel.send('Get information about an expansion, location, creature, or sound.');
      } else {
        return message.channel.send(s.search(message, args));
      }
    },
};
