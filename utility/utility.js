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
      let args = message.content.slice(message.client.getPrefix(message).length).split(' ');
      let command = args.shift().toLowerCase();
      if (!message.client.commands.has(command)){
        args = [command];
        console.log(args);
        command = "play";
      }
      return {args:args, command:message.client.commands.get(command)}
    }
};
