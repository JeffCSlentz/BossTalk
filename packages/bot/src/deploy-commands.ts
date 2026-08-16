import './loadEnv';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import { loadConfig } from './config';
import logger from './logger';
import { commands } from './interactions/registry';

async function main(): Promise<void> {
  const config = loadConfig();
  const body = commands.map((c) => ('toJSON' in c.data ? c.data.toJSON() : c.data));

  const rest = new REST().setToken(config.discordToken);

  if (config.nodeEnv === 'development') {
    if (!config.discordGuildId) throw new Error('DISCORD_GUILD_ID is required to register guild-scoped commands in development');
    await rest.put(Routes.applicationGuildCommands(config.discordClientId, config.discordGuildId), { body });
    logger.info('Registered guild application commands.');
  } else {
    await rest.put(Routes.applicationCommands(config.discordClientId), { body });
    logger.info('Registered global application commands.');
  }
}

main().catch((err) => {
  logger.error(err);
  process.exit(1);
});
