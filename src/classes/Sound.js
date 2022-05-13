const Location = require('./Location.js');

class Sound{
  /**
   * @description Represents a sound file and stores information about that sound file.
   * @param {string} filePath - Required?
   * @param {Location} [location] - Optional, the location this sound is played in.
   * @param {string} [text] - English Translation of the sound
   * @param {boolean} [hasSpeech] - Whether this sound has speech at all.
   */
  constructor(filePath, location, text, hasSpeech){
    this.filePath = filePath;
    this.creatureName = filePath.split('/').at(-2);
    this.location = location || new Location();
    this.text = text || "";
    this.hasSpeech = hasSpeech || true;  
  }
}
module.exports = Sound;
