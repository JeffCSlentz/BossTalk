import { Client, Events, MessageFlags } from 'discord.js';
import { commands } from './registry';
import logger from '../logger';

async function safeErrorReply(interaction: any, message = 'Sorry, something went wrong.'): Promise<void> {
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: message, flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
    }
  } catch (err) {
    logger.error(`Failed to send error reply: ${err}`);
  }
}

function isFresh(createdTimestamp: number): boolean {
  return Date.now() - createdTimestamp < 2500;
}

// Single interaction listener, replacing the 5 near-duplicate InteractionCreate
// handlers the old bot registered (one per interaction type).
export function registerInteractionRouter(client: Client): void {
  client.on(Events.InteractionCreate, async (interaction: any) => {
    try {
      if (interaction.isChatInputCommand()) {
        const command = commands.get(interaction.commandName);
        if (!command?.execute) return safeErrorReply(interaction);
        logger.info(`Command /${interaction.commandName} used by ${interaction.user.tag}`);
        interaction.client.bot.stats.commandRan(interaction.user.id, interaction.user.tag, interaction.commandName);
        return await command.execute(interaction);
      }

      if (interaction.isAutocomplete()) {
        const command = commands.get(interaction.commandName);
        if (!command?.autocomplete) return;
        return await command.autocomplete(interaction);
      }

      if (interaction.isButton()) {
        const data = JSON.parse(interaction.customId);
        const command = commands.get(data.command);
        if (!command?.button) return safeErrorReply(interaction);
        return await command.button(interaction);
      }

      if (interaction.isStringSelectMenu()) {
        const data = JSON.parse(interaction.customId);
        const command = commands.get(data.command);
        if (!command?.select) return;
        return await command.select(interaction);
      }

      if (interaction.isModalSubmit()) {
        const data = JSON.parse(interaction.customId);
        const command = commands.get(data.command);
        if (!command?.modal) return;
        return await command.modal(interaction);
      }
    } catch (error) {
      logger.error(error as Error);
      if (!interaction.isRepliable?.() || !isFresh(interaction.createdTimestamp)) return;

      if (interaction.isButton?.() || interaction.isStringSelectMenu?.() || interaction.isModalSubmit?.()) {
        await interaction.deferUpdate().catch(() => {});
      } else {
        await safeErrorReply(interaction, 'There was an error while executing this command!');
      }
    }
  });
}
