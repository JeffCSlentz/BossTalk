const dataManip = require('../utility/dataManipulation.js');
const Position = require('../utility/classes/Position.js');

module.exports = {
    name: 'update',
    description: 'Help me out by suggesting a change to a creature or sound. Change will be entered for review.',
    usage: '[creature] [expansion] [location] OR [soundID] [expansion] [location] OR [soundIDstart] [soundIDend] [expansion] [location] OR ["file"] [filename] [expansion] [location]',
    guildOnly: false,
    authorOnly: false,
    execute(message, args) {
      const successMessage = "Thank your for your suggestion!"
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
          dataManip.writeToUpdateRequests(message, args);
          return message.channel.send(successMessage);
        }
        else{
          return message.channel.send("No sounds with that fileName found.");
        }
      }

      //If the first argument is a creature.
      if(message.client.creatureSounds.has(args[0])){
        data = []
        dataManip.writeToUpdateRequests(message, args);
        return message.channel.send(successMessage);
      }
      //If the first and second arguments are integers.
      else if(message.client.allSounds.has(parseInt(args[0])) && message.client.allSounds.has(parseInt(args[1]))){
        dataManip.writeToUpdateRequests(message, args);
        return message.channel.send(successMessage);
      }
      //If the first argument is an integer.
      else if(message.client.allSounds.has(parseInt(args[0]))){
        reply = dataManip.writeToUpdateRequests(message, args);
        return message.channel.send(successMessage);
      }
      //If the first argument isn't an integer or a recognized creature.
      else{
        return message.channel.send(`I don't recognize that creature. (´･ω･\`) `)
      }
    },
};
