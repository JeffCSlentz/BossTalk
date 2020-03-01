# BossTalk
Discord bot that plays almost ANY voice line from World of Warcraft.

## Adding BossTalk to your own Discord server.
Work in Progress

## Current World of Warcraft Patch
Currently has creatures from up to 8.0.1

#### Commands

Add the prefix, defaulted to "!", before these commands.

* **help** [none/command]
  * Shows how to use a command.
  
* **info** [expansion/location/creature/soundID]
  * Gives you more info on one of the four things above, in that order.
  
* **join** [none/channel name/channel ID]
  * Joins a voice channel. If left blank, will join the voice channel you're in.
  
* **leave**
  * Boss Talk will leave it's current channel.
  
* **play** [soundID/random/rand/r]
  * Plays a specific sound, or one at random. Can also be used with just the prefix, aka ![soundID].

* **tag** [soundID] [tag]
  * Tags a sound with a shortcut you can call with !play [tag] or ![tag].
  
* **tags**
  * Lists the server's current tags.
  
* **update** [creature] [expansion] [location]
  * Suggest some data to a creature.
  
* **volume** [0-1]
  * Sets the bots volume to a value between 0 and 1. IE !volume 0.5 makes the bot half as loud.