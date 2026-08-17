import './loadEnv';
import { Events } from 'discord.js';
import { loadConfig } from './config';
import logger from './logger';
import { createClient } from './client';
import { Catalog } from './services/catalog';
import { GuildTags } from './services/guildTags';
import { Stats } from './services/stats';
import { registerInteractionRouter } from './interactions/router';
import { registerVoiceHandlers } from './voice/connectionManager';
import { buildHelpPayload } from './payloads/help';
import { formatError } from './logger';

async function main(): Promise<void> {
  const config = loadConfig();
  const client = createClient();

  const guildTags = new GuildTags({
    accountId: config.r2.accountId,
    accessKeyId: config.r2.accessKeyId,
    secretAccessKey: config.r2.secretAccessKey,
    bucket: config.r2.bucket,
  });
  await guildTags.init();

  const stats = new Stats(config.statsFlushIntervalSeconds, {
    accountId: config.r2.accountId,
    accessKeyId: config.r2.accessKeyId,
    secretAccessKey: config.r2.secretAccessKey,
    bucket: config.r2.bucket,
  });
  await stats.init();
  stats.start();

  client.bot = {
    catalog: new Catalog(config.algoliaAppId, config.algoliaSearchApiKey),
    guildTags,
    stats,
  };

  registerInteractionRouter(client);
  registerVoiceHandlers(client);

  client.on('guildCreate', async (guild) => {
    client.bot.stats.addGuild(guild.id, guild.name);
    try {
      await guild.systemChannel?.send(buildHelpPayload());
    } catch (err) {
      logger.debug(`Couldn't post welcome message in ${guild.name} (probably no permission): ${formatError(err)}`);
    }
  });
  client.on('guildDelete', (guild) => client.bot.stats.removeGuild(guild.id, guild.name));
  client.once(Events.ClientReady, (c) => logger.info(`Ready! Logged in as ${c.user.tag}`));
  client.on('error', (err) => logger.error(err));

  await client.login(config.discordToken);
}

main().catch((err) => {
  logger.error(err);
  process.exit(1);
});
