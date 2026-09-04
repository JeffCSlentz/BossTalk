// One-off: wipes guild-scoped slash commands for a single guild so it falls
// back to the global command set. Needed when a guild still has stale
// guild-scoped commands left over from a `deploy-commands` run in development
// mode (see deploy-commands.ts) shadowing the updated global commands.
// Usage: npx ts-node scripts/clearGuildCommands.ts <token> <clientId> <guildId>
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';

const [token, clientId, guildId] = process.argv.slice(2);
if (!token || !clientId || !guildId) {
  console.error('Usage: npx ts-node scripts/clearGuildCommands.ts <token> <clientId> <guildId>');
  process.exit(1);
}

async function main(): Promise<void> {
  const rest = new REST().setToken(token);
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
  console.log(`Cleared guild-scoped commands for guild ${guildId}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
