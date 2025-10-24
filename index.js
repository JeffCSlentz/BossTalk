//#region Variables
const {token, doReindex} = require('./config.json');
const Discord = require('discord.js');
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
const {reindex} = require('./src/reindex')
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

client.on('guildCreate', guild => {
  client.bosstalk.stats.addGuild(guild);
});

client.on('guildDelete', guild => {
  client.bosstalk.stats.removeGuild(guild);
});

client.on('error', console.error);
//#endregion