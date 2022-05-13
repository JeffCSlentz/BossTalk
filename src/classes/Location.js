class Location{
  constructor(expansion, zone, type) {
    this.expansion = expansion || "";
    this.zone = zone || "";
    this.type = type || "";
  }
}

module.exports = Location;