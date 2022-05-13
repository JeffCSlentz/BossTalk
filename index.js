//#region Variables
const {token, doReindex} = require('./config.json');
const Discord = require('discord.js');
const client = new Discord.Client({intents: [
  Discord.Intents.FLAGS.GUILDS, 
  Discord.Intents.FLAGS.GUILD_MESSAGES, 
  Discord.Intents.FLAGS.DIRECT_MESSAGES, 
  Discord.Intents.FLAGS.GUILD_VOICE_STATES]}
);
const BossTalk = require('./src/BossTalk.js');

//Third-Party
const logger = require('./src/logger.js').logger;
const discordjsModal = require('discordjs-modal') // Define this package
discordjsModal(client); // It is necessary to have your client to be able to know when a modal is executed

//Will check sounds/creature for new .ogg files and save them back into sounds.json
const {reindex} = require('./src/reindex')
if (doReindex) reindex();

//Load run-time data
client.bosstalk = new BossTalk();

//#endregion

client.login(token);

client.once('ready', () => {
  logger.info('Ready!')
});

//Command
client.on('interactionCreate', async interaction => {
	if(!interaction.isCommand()) return;
  logger.info("Command " + interaction.commandName + " by someone!")
  
  const command = client.bosstalk.slashCommands.get(interaction.commandName);
  if (!command){
    logger.error('Command not found!');
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
client.on('interactionCreate', async interaction => {
	if(!interaction.isAutocomplete()) return;
  

  const command = client.bosstalk.slashCommands.get(interaction.commandName);
  if (!command){
    logger.error('Command not found!');
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
client.on('interactionCreate', async interaction => {
	if(!interaction.isButton()) return;
  
  
  const command = client.bosstalk.slashCommands.get(JSON.parse(interaction.customId).command) || client.bosstalk.slashCommands.get(interaction.message.interaction.commandName);
  if (!command){
    logger.error('Command not found!');
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
client.on('interactionCreate', async interaction => {
	if(!interaction.isSelectMenu()) return;
  
  
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
client.on('modal', async (interaction) => {
  
  
  const command = client.bosstalk.slashCommands.get(JSON.parse(interaction.data.data.custom_id).command);
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