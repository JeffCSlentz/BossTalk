const fs = require('node:fs');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { clientId, guildId, token, env } = require('../config.json');

const commands = [];
const commandFiles = fs.readdirSync('./src/slash_commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./slash_commands/${file}`);
	commands.push(command.data.toJSON());
}

const rest = new REST({ version: '9' }).setToken(token);

if(env == 'dev'){
	rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
		.then(() => console.log('Successfully registered guild application commands.'))
		.catch(console.error);

} else if (env == 'prod'){
	rest.put(Routes.applicationCommands(clientId), { body: commands })
		.then(() => console.log('Successfully registered global application commands.'))
		.catch(console.error);

}
process.exit();

