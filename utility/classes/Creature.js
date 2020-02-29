class Creature{
  constructor(folder, positions, sounds) {
    this.name = folder;
    this.folderPath = `'./sounds/creature/${folder}`;
    this.positions = positions;
    this.sounds = sounds;
  }
}

module.exports = Creature;
