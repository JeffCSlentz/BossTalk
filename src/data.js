const fs = require('fs');
const Discord = require('discord.js');
const logger = require('./logger.js').logger;

module.exports = {
    /**
     * Loads a Discord.Collection from a json file.
     * @param {*} filePath 
     * @returns Discord.Collection()
     */
     readDiscordCollection(filePath){
        if(fs.existsSync(filePath)){
            try {
                result = new Discord.Collection(JSON.parse(fs.readFileSync(filePath)));
                logger.info(`Loaded ${filePath}`);
                return result;
            } catch(error) {
                logger.error(`Something went wrong loading ${filePath}. Is it corrupted? Returning empty Discord Collection.`);
                logger.error(error)
                return new Discord.Collection();
            }
        }
        else{
            logger.info(`${filePath} not found. Returning empty Discord Collection.`)
            return new Discord.Collection();
        }
    },

    /**
     * Writes a Discord.Collection to a json file.
     * @param {*} collection 
     * @param {*} filePath 
     */
    writeDiscordCollection(collection, filePath){
        try {
            fs.writeFileSync(filePath, JSON.stringify([...collection]));
            logger.info(`Wrote to ${filePath}!`);
        } catch (error) {
            logger.error("Write Discord Collection Failed!")
            throw error;
        }
    },

    /**
     * Loads a JSON object/array from a JSON file.
     * @param {*} filePath 
     * @returns A JSON object or array
     */
    readJSONObject(filePath){
        try {
            result = JSON.parse(fs.readFileSync(filePath));
            logger.info(`Loaded ${filePath}`);
            return result;
        } catch(error) {
            logger.error(`Something went wrong loading ${filePath}.`);
            throw(error);
        }
    },

    /**
     * Writes a JSON object/array to a JSON file.
     * @param {*} obj 
     * @param {*} filePath 
     */
    writeJSONObject(obj, filePath){
        try{
            fs.writeFileSync(filePath, JSON.stringify(obj));
            logger.info(`Wrote to ${filePath}!`);
        } catch(error) {
            logger.error("Write JSON Object Failed!")
            throw(error);
        }
    },
}