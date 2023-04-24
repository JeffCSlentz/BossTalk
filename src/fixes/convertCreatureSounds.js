
const Location = require('../classes/Location.js');
const Sound = require('../classes/Sound.js');
const Tag = require('../classes/Tag.js');
const {readDiscordCollection, writeJSONObject, writeDiscordCollection} = require('../data.js')
const logger = require('../logger.js').logger;
const dataFolder = './data';
const { performance } = require('perf_hooks');

/**
 * Files that are safe to move to backup:
 * allSounds.json
 * categorySounds.json
 * creatureSounds.json
 * filePathSounds.json
 * guildData.json
 */


const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
});

readline.question(
    `This function translates creatureSounds.json to sounds.json. 
     It also converts guildTags to the new format.
     It should only be run once.
     You should then archive  
     * allSounds.json
     * categorySounds.json
     * creatureSounds.json
     * filePathSounds.json
     
        Are you sure? Type YES to confirm: `,
    input => { 
        if(input == "YES"){
            convertCreatureSounds();
            convertGuildTags();
            readline.close();
        }
        else{
            readline.close();
            return;
        }
    }
); 


/**
 * @description ~~WARNING~~ RUN ONCE ONLY! Converts creatureSounds.json to the new sounds.json style.
 */
async function convertCreatureSounds(){
    let creatureSounds = readDiscordCollection(`${dataFolder}/creatureSounds.json`);
    let translations = readDiscordCollection(`${dataFolder}/translations.json`)

    let startTime = performance.now()
    let tempSounds = [];
    for (let creature of creatureSounds.values()){
        
        for (let sound of creature.sounds){
            let expansion = translations.get(sound.position.expansion) || sound.position.expansion;
            let zone = "";
            if(sound.position.location != "world" && sound.position.location != ""){
                zone = translations.get(sound.position.location) || sound.position.location
            }
            let type = sound.position.location == "world" ? "world" : "";
            
            tempSounds.push(new Sound(
                sound.filePath,
                new Location(expansion, zone, type),
                sound.text,
            ))
        }
    };

    let endTime = performance.now()

    logger.info(`Call to load creatureSounds.json and write sounds.json took ${endTime - startTime} milliseconds`)
    await writeJSONObject(tempSounds, `${dataFolder}/sounds.json`)
    
}

/**
 * 
 */
function convertGuildTags(){
    let guildTags = readDiscordCollection(`${dataFolder}/guildTags.json`);
    writeDiscordCollection(guildTags, `${dataFolder}/guildTagsOld.json`)
    
    //Rewrite guildTags
    for(const [guild, tags] of guildTags){
        let soundFilePaths = [];
        for (const [tag, filePaths] of Object.entries(tags)){
            filePaths.forEach(filePath => soundFilePaths.push(new Tag(tag,filePath)));
        }
        guildTags.set(guild, soundFilePaths);
    }
    
    writeDiscordCollection(guildTags, `${dataFolder}/guildTags.json`)
}