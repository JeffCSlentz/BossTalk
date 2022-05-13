const {readJSONObject, writeJSONObject} = require('./data');
const bannedWords = ["wound", "attack", "crit", "battleshout"];
const dataFolder = './data';
const Sound = require('./classes/Sound.js');
const fs = require('fs');
const logger = require('./logger.js').logger;

function reindex(){
  logger.warn("Reindexing!")
  //Grab the current known sounds and make an array of their filepaths.
  // For example:
  //  ["f1.ogg", "f2.ogg", "f3.ogg"]
  let _runtimeSoundsArr = time(readJSONObject, "make runtimeSoundsArr")(`${dataFolder}/sounds.json`);
  let _runtimeFilePathsArr = time(_runtimeSoundsArr.map.bind(_runtimeSoundsArr), "make _runtimeFilePathsArr")((s) => s.filePath);

  //Grab the current files in the sounds/creature directory, filtering by file size and stopwords.
  // For example:
  //  ["f2.ogg", "f3.ogg", "f4.ogg"]
  //  f1 was deleted, f4 was added.
  let _fileSounds = time(grabFileSounds, "make _fileSounds")();

  // Grab the files that exist but haven't been indexed yet.
  let _newSoundFilesSet = time(difference, 'difB',)( new Set(_fileSounds), new Set(_runtimeFilePathsArr));

  //Report and clean up duplicates
  logger.info(`Found ${toFindDuplicates(_runtimeFilePathsArr).length} duplicate sounds 🙄`);
  let _runtimeSoundsMap = new Map(_runtimeSoundsArr.map(o => [o.filePath, o]))
  
  //Add the new files
  let _newSounds = [..._newSoundFilesSet].map(filePath => new Sound(filePath))
  let sounds = [..._runtimeSoundsMap.values()];
  sounds.push(..._newSounds)
  
  //Log some stats for me :)
  let _creatureNames = new Set([..._newSoundFilesSet].map((s) => s.split('/').at(-2)))
  logger.info(`Found ${_newSoundFilesSet.size} new sound files from ${_creatureNames.size} creatures`)
  
  //Write the file back.
  writeJSONObject(sounds,`${dataFolder}/sounds.json`)
  logger.info("Reindexing Complete! 😀")
}

function toFindDuplicates(arry) {
  const uniqueElements = new Set(arry);
  const filteredElements = arry.filter(item => {
      if (uniqueElements.has(item)) {
          uniqueElements.delete(item);
      } else {
          return item;
      }
  });

  return filteredElements
}


function difference(setA, setB) {
  let _difference = new Set(setA)
  for (let elem of setB) {
      _difference.delete(elem)
  }
  return _difference
}


function time(fn, name){
  return (...args) => {
      const _startTime = performance.now()
      res = fn(...args)
      const _endTime = performance.now()
      logger.info(`Call ${name} took ${_endTime - _startTime} milliseconds`)
      return res;
  }
}

function grabFileSounds(){
  const creatureFiles = fs.readdirSync(`./sounds/creature/`);
  let _fileSounds = []
  for (const folder of creatureFiles){
      _fileSounds.push(...(fs.readdirSync(`./sounds/creature/${folder}`).map(soundFile => `./sounds/creature/${folder}/${soundFile}`)));
  }

  _fileSounds = _fileSounds.filter(fp => fs.statSync(`${fp}`)["size"] > 4200 && !bannedWords.some(word => fp.includes(word)));
  
  return _fileSounds;
}


  
module.exports = {reindex};