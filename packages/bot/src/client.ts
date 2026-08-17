import { Client, GatewayIntentBits } from 'discord.js';
import { Catalog } from './services/catalog';
import { GuildTags } from './services/guildTags';
import { Stats } from './services/stats';

export interface BotServices {
  catalog: Catalog;
  guildTags: GuildTags;
  stats: Stats;
}

declare module 'discord.js' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Client {
    bot: BotServices;
  }
}

export function createClient(): Client {
  return new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.GuildVoiceStates,
    ],
  });
}
