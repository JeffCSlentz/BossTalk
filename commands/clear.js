const dataManip = require('./../utility/dataManipulation.js');
const Position = require('./../utility/classes/Position.js');
const utility = require('./../utility/utility.js');

module.exports = {
    name: 'clear',
    description: 'Clear out a creature\'s expansions and locations and all its sounds or remove a specific location from a creature.',
    usage: '[creature] (opt)[location]',
    guildOnly: false,
    execute(message, args) {
      if (args.length === 1){
        arg = args[0].toLowerCase();
        if (message.client.creatureSounds.has(arg)){
          dataManip.clearLocationFromCreature(message, arg);
          return message.channel.send(`Okay! I cleared all location data from ${arg} and it's sounds.`);
        }
        else{
          return message.channel.send(`I couldn't find that creature. (✖╭╮✖)`);
        }
      }
      else if( args.length === 2){
        creatureName = args[0].toLowerCase();
        location = args[1].toLowerCase();
        if (message.client.creatureSounds.has(creatureName)){
          if(dataManip.clearSpecificLocationFromCreature(message, creatureName, location)){
            return message.channel.send(`Okay! I cleared ${location} from ${creatureName}.`);
          }
          else{
            return message.channel.send(`I couldn't find that location.`)
          }

        }
        else{
          return message.channel.send(`I couldn't find that creature. (✖╭╮✖)`);
        }
      }
      else{
        return message.channel.send("Too many arguments.");
      }

    },
};
