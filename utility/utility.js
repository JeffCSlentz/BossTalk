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
    getCommandFromMessage(message){
      let command = splitUpMessageIntoArray(message).slice(0,1)[0];
      if (!message.client.commands.has(command)){
        args = [command];
        command = "play";
      }
      return message.client.commands.get(command);
    },
    getArgsFromMessage(message){
      args = splitUpMessageIntoArray(message).slice(1);
      return args;
    }
};

function splitUpMessageIntoArray(message){
  prefix = message.client.prefix;
  return message.content.toLowerCase().slice(prefix.length).split(' ')
}