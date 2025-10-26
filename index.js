//#region Variables
const {token, doReindex} = require('./config.json');
const Discord = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');
const client = new Discord.Client({intents: [
  Discord.GatewayIntentBits.Guilds, 
  Discord.GatewayIntentBits.GuildMessages, 
  Discord.GatewayIntentBits.DirectMessages, 
  Discord.GatewayIntentBits.GuildVoiceStates]}
);
const BossTalk = require('./src/BossTalk.js');

//Third-Party
const logger = require('./src/logger.js').logger;

//Will check sounds/creature for new .ogg files and save them back into sounds.json
const {reindex} = require('./src/reindex');
const { Logger } = require('winston');
if (doReindex) reindex();

//Load run-time data
client.bosstalk = new BossTalk();

//#endregion

client.login(token);

client.once(Discord.Events.ClientReady, c =>{
  logger.info('Ready!')
});

//Command
client.on(Discord.Events.InteractionCreate, async interaction => {
	if(!interaction.isCommand()) return;
  logger.info("Command " + interaction.commandName + " by someone!")
  
  const command = client.bosstalk.slashCommands.get(interaction.commandName);
  if (!command){
    logger.error(new Error('Command not found!'));
    // Safely reply to the user    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'Sorry, something went wrong.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'Sorry, something went wrong.', ephemeral: true });
    }
    return;
  }

  try {
    return await command.execute(interaction);
  }
  catch(error){
    logger.error(error)
    if((new Date(Date.now()) - interaction.createdAt) < 2500){
      return await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
  }
});

//Autocomplete
client.on(Discord.Events.InteractionCreate, async interaction => {
	if(!interaction.isAutocomplete()) return;
  

  const command = client.bosstalk.slashCommands.get(interaction.commandName);
  if (!command){
    logger.error(new Error('Command not found!'));
    // Safely reply to the user    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'Sorry, something went wrong.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'Sorry, something went wrong.', ephemeral: true });
    }
    return;
  }

  try {
    return await command.autocomplete(interaction);
  }
  catch(error){
    logger.error(error)
  }
});

//Button
client.on(Discord.Events.InteractionCreate, async interaction => {
	if(!interaction.isButton()) return;
  
  
  const command = client.bosstalk.slashCommands.get(JSON.parse(interaction.customId).command) || client.bosstalk.slashCommands.get(interaction.message.interaction.commandName);
  if (!command){
    logger.error(new Error('Command not found!'));
    // Safely reply to the user    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'Sorry, something went wrong.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'Sorry, something went wrong.', ephemeral: true });
    }
    return;
  }

  try {
    return await command.button(interaction);
  }
  catch(error){
    logger.error(error)
    if((new Date(Date.now()) - interaction.createdAt) < 2500){
      return await interaction.deferUpdate();
    }
  }
});

//Select Menu
client.on(Discord.Events.InteractionCreate, async interaction => {
	if(!interaction.isStringSelectMenu()) return;
  
  
  const command = client.bosstalk.slashCommands.get(JSON.parse(interaction.customId).command || interaction.message.interaction.commandName);
  if (!command) return;

  try {
    return await command.select(interaction);
  }
  catch(error){
    logger.error(error)
    if((performance.now() - interaction.createdAt) < 2500){
      return await interaction.deferUpdate();
    }
  }
});

//Modal Submit
client.on(Discord.Events.InteractionCreate, async (interaction) => {
  if (!interaction.isModalSubmit()) return;
  
  const command = client.bosstalk.slashCommands.get(JSON.parse(interaction.customId).command);
  if (!command) return;

  try {
    return await command.modal(interaction);
  }
  catch(error){
    logger.error(error)
    if((new Date(Date.now()) - interaction.createdAt) < 2500){
      return await interaction.deferUpdate();
    }
  }
});

//Voice State Changed
client.on(Discord.Events.VoiceStateUpdate, async(oldState, newState) => {
  const connection = getVoiceConnection(oldState.guild.id);
   if (!connection) return;

  const botId = client.user.id;
  const botChannelId = connection.joinConfig.channelId;


  // 1️⃣ Bot was disconnected from a channel
  if (oldState.member.id === botId && !newState.channelId && connection) {
    connection.destroy();
    logger.info(`Bot was disconnected from ${oldState.guild.name}.`);
    return;
  }

  // 2️⃣ Someone left the bot's channel — check if it's now empty
  if (oldState.channelId === botChannelId && oldState.channel) {
    // Count members still in the channel excluding the bot
    const nonBotMembers = oldState.channel.members.filter(m => !m.user.bot);
    if (nonBotMembers.size === 0) {
      connection.destroy();
      logger.info(`No users left in ${oldState.guild.name} — disconnected.`);
    }
  }
});

client.on('guildCreate', guild => {
  client.bosstalk.stats.addGuild(guild);
});

client.on('guildDelete', guild => {
  client.bosstalk.stats.removeGuild(guild);
});

client.on('error', console.error);
//#endregion