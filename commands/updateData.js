const dataManip = require('../utility/dataManipulation.js');
const Position = require('../utility/classes/Position.js');

module.exports = {
    name: 'updateData',
    description: 'Give a creature or sound some information. Don\'t fuck it up, it\'s a pain in the ass to fix.',
    usage: '[creature] [expansion] [location] OR [soundID] [expansion] [location] OR [soundIDstart] [soundIDend] [expansion] [location] OR ["file"] [filename] [expansion] [location]',
    guildOnly: false,
    authorOnly: true,
    execute(message, args) {
      //If the first argument is "file"
      if(args[0] === `file`){

        console.log("update.js:13 " + args + "\n");

        if( args.length < 4){
          return message.channel.send("Not enough arguments.");
        }
        if( args[1].length < 5){
          return message.channel.send("fileName matching is too short.");
        }
        matchingSounds = message.client.allSounds.filter(sound => sound.filePath.includes(args[1])).array();
        if(matchingSounds.length > 250){
          return message.channel.send("fileName matched over 250 sounds. Match fewer.");
        }
        if(matchingSounds.length > 0){
          return message.channel.send(dataManip.giveLocationToListOfSounds(message, matchingSounds, new Position(args[2].toLowerCase(), args[3].toLowerCase())));
        }
        else{
          return message.channel.send("No sounds with that fileName found.");
        }
      }

      //If the first argument is a creature.
      if(message.client.creatureSounds.has(args[0])){
        data = []
        data.push(dataManip.giveLocationToCreature(message, args[0].toLowerCase(), new Position(args[1].toLowerCase(), args[2].toLowerCase())));
        data.push(`You have ${message.client.browniePoints.get(message.author.id)} brownie points!`);
        return message.channel.send(data);

      }
      //If the first and second arguments are integers.
      else if(message.client.allSounds.has(parseInt(args[0])) && message.client.allSounds.has(parseInt(args[1]))){
        return message.channel.send(dataManip.giveLocationToSoundRange(message, parseInt(args[0]), parseInt(args[1]), new Position(args[2].toLowerCase(), args[3].toLowerCase())));
      }
      //If the first argument is an integer.
      else if(message.client.allSounds.has(parseInt(args[0]))){
        return message.channel.send(dataManip.giveLocationToSound(message, parseInt(args[0]), new Position(args[1].toLowerCase(), args[2].toLowerCase()), true));
      }
      //If the first argument isn't an integer or a recognized creature.
      else{
        return message.channel.send(`I don't recognize that creature. (´･ω･\`) `)
      }
    },
};
