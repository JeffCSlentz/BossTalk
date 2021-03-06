module.exports = {
    GetAlwaysFromCollection(collection, key, value) {
      if(collection.has(key)){
        value = collection.get(key);
      }
      else{
        collection.set(key, value);
      }
      return value;
    },
    listOfStringsLength(list){
      let total = 0;
      for(item of list){
        total += item.length;
      }
      return total;
    },
    getParamsFromMessage(message){
      let args = message.content.slice(message.client.provider.getGuildProperty(message.guild, "prefix").length).split(' ');
      let command = args.shift().toLowerCase();
      if (!message.client.commands.has(command)){
        args = [command];
        command = "play";
      }
      if(args.length == 1 && args[0] == ""){
        args = [];
      }
      return {args:args, command:message.client.commands.get(command)}
    }
};
