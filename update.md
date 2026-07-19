I'd like to refactor this repository. Currently, it's a discord bot set up to play sounds from World of Warcraft. I use an external 
  program to download the sounds manually to this repo, and it hosts via git LFS. Then, I have a virtual pc running the node program to
  host the bot.
  
  I'd like to keep the bot but I need to decouple this into several different projects or sections. I am thinking of keeping it as a 
  single repository, but separating it into several components, some hosted, some local, and some SAAS.

  Component 1: Sound Uploader
  This would be a Windows service/electron app that has a UX or config file to choose a World of Warcraft retail installation. Today I
  use https://www.kruithne.net/wow.export (https://github.com/Kruithne/wow.export), so ideally the code/library that powers that
  utility can be baked into the Windows service. This component would be responsible for unpacking files from a local installation and 
  uploading them to file services and search services needed for later components. Ideally, it would check for diffs on a daily or 
  weekly cadence and self heal. I would likely keep this service running on my local computer and be able to check its' logs or UX if I
  needed. A stretch goal would be to have it email me or discord message me or text me when new sounds were successfully added.
  
  Component 2: Website
  This would be a discoverability layer into the sounds themselves. It would feature a homepage with a search bar front and center and 
  perhaps some popular or sounds of my choosing below. Users would be able to search and find sounds, favorite them, preview them, and 
  download them. Ideally, there would be an integration with Component 3, the Discord bot, that allowed Users to play sounds for their 
  friends using the web app instead of the discord bot commands. Additionally, if the website is able to add sounds directly to users' 
  Soundboard, that'd be cool.
  
  Component 3: Discord Bot
  This is mostly running today, but has some problems. Mainly, the sound data is coupled directly to the repository itself, leading to 
  needing a thick service that requires a lot of disk space and can keep and serve sound files locally. This should be a thin service.
  
  Component 4: File Hosting
  The raw .ogg files are currently hosted via github LFS and attached directly to the repository. This leads to long git times and I'd 
  rather just have the files hosted on a service. Ideal shape of service would be like a hobby tier for 80-120gb of sounds files with 
  free egress and choice of hosting location to minimize latency with the bot, website, and users. Perhaps served at the edge for the 
  website? Component 1 would need to upload files here. The files that come out of the WoW installation are already sorted into folders
  and do not change AFAIK, so the same naming/file identifier would be able to stay consistent.
  
  Component 5: Search
   