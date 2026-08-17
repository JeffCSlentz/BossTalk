import './loadEnv';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import { loadConfig } from './config';
import logger from './logger';
import { commands } from './interactions/registry';

// /play random|creature|tag auto-join now, so /join no longer needs to be a
// typeable command — but its handler stays registered in interactions/registry.ts
// for the "Join?" button that button-triggered plays (reroll/flip/select) still
// show when there's no connection, since those intentionally don't auto-join.
const HIDDEN_FROM_SLASH_PICKER = new Set(['join']);

async function main(): Promise<void> {
  const config = loadConfig();
  const body = commands
    .filter((_, name) => !HIDDEN_FROM_SLASH_PICKER.has(name))
    .map((c) => ('toJSON' in c.data ? c.data.toJSON() : c.data));

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
