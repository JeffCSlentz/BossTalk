import './loadEnv';

function require_env(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function optional_env(key: string, fallback = ''): string {
  return process.env[key] ?? fallback;
}

export interface BotConfig {
  discordToken: string;
  discordClientId: string;
  discordGuildId: string;
  nodeEnv: 'development' | 'production';
  algoliaAppId: string;
  algoliaSearchApiKey: string;
  r2: {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    publicUrl: string;
  };
  statsFlushIntervalSeconds: number;
}

export function loadConfig(): BotConfig {
  return {
    discordToken: require_env('DISCORD_TOKEN'),
    discordClientId: require_env('DISCORD_CLIENT_ID'),
    discordGuildId: optional_env('DISCORD_GUILD_ID'),
    nodeEnv: (optional_env('NODE_ENV', 'development') as 'development' | 'production'),
    algoliaAppId: require_env('ALGOLIA_APP_ID'),
    algoliaSearchApiKey: require_env('ALGOLIA_SEARCH_API_KEY'),
    r2: {
      accountId: require_env('R2_ACCOUNT_ID'),
      accessKeyId: require_env('R2_ACCESS_KEY_ID'),
      secretAccessKey: require_env('R2_SECRET_ACCESS_KEY'),
      bucket: optional_env('R2_BUCKET', 'bosstalk-sounds'),
      publicUrl: optional_env('R2_PUBLIC_URL', 'https://cdn.bosstalk.io'),
    },
    statsFlushIntervalSeconds: parseInt(optional_env('STATS_FLUSH_INTERVAL_SECONDS', '45'), 10),
  };
}
