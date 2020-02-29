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
};
