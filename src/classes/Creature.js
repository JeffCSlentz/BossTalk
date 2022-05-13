class Creature{
    /**
     * 
     * @param {string} name 
     * @param {Sound[]} sounds 
     */
    constructor(name, sounds){
        this.name = name;
        this.sounds = sounds;
    }
}

module.exports = Creature;