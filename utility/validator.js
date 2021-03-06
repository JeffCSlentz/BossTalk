
module.exports = {
    validate(message, args, command){
        if(command.authorOnly && message.author.id != message.client.authorID){
            return new Validation(false, null);
        }
        if(command.guildOnly && message.channel.type != "text"){
            return new Validation(false, "I can only do that in a guild.");
        }
        if(command.guildOnly && !message.guild.available){
            return new Validation(false, "It looks like the server is not available.")
        }
        if(command.adminOnly && !message.member.permissions.has("ADMINISTRATOR")){
            return new Validation(false, "this command requires an administrator.")
        }
        if(command.inVoiceOnly && message.guild && !message.guild.voice){
            if (command.name == "play"){
                return new Validation(false, `I tried to play sound **${args[0]}** but I'm not in a voice channel! Use the join command.`);
            }
            return new Validation(false, "I'm not in a voice channel! Use the join command.");
        }
        return new Validation(true, null);
    },
    helpMessageValidate(message, args, command){
        if(command.authorOnly && message.author.id != message.client.authorID){
            return false;
        }
        return true;
    }
}

class Validation{
    constructor(isValid, suggestion) {
        this.isValid = isValid;
        this.suggestion = suggestion;
    }
}