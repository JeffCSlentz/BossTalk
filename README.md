# BossTalk
![yelling guy](data/shout.png "Me yell")

Discord bot that plays almost ANY voice line from World of Warcraft.

## Inviting BossTalk

Invite [Boss Talk](https://discordapp.com/api/oauth2/authorize?client_id=442843632576233472&permissions=36755776&scope=bot) to your server. 

Make sure it has permissions to speak and chat, possibly by giving it it's own role.

#### Getting Started

`!help` to get a list of all commands available to you.

`!join` to make BossTalk join your channel.

`!play r` or `!r` to play a completely random sound from WoW!

`!volume [0-1]` if he was too loud or too quiet.

`!info` to explore some possible sounds.

`!tag [soundID] [tag name]` to save a sound for later.

For example, type `!tag 27184 runaway` then play it with `!runaway`

## Current World of Warcraft Patch
Currently has creatures from up to 8.3.1


#### Commands

Add the prefix, defaulted to "!", before these commands.

* **help** [none/command]
  * Shows how to use a command.
  
* **info** [expansion/location/creature/soundID]
  * Gives you more info on one of the four things above.
  * "`!info vanilla`" will show all the dungeons/raids associated with original world of warcraft. 
  * "`!info ssc`" will show all the creatures in SSC (Serpent Shrine Cavern)
  * "`!info king`" will show all creatures with king in their name.
  * "`!info 3483`" will give you info on sound number 3483.
  
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

* **prefix** [prefix]
  * Change BossTalks prefix from it's default, `!`

* **volume** [0-1]
  * Sets the bots volume to a value between 0 and 1. IE !volume 0.5 makes the bot half as loud.

* **stats**
  * Shows some stats.