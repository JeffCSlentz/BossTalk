import { EmbedBuilder } from 'discord.js';

export function buildHelpPayload() {
  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('BossTalk — Commands')
    .addFields(
      { name: '/play random', value: 'Play a random WoW voice line.' },
      { name: '/play sound', value: 'Search for a sound — by creature name, or by something it said.' },
      { name: '/play tag', value: 'Play a sound your server has tagged for quick access.' },
      { name: '/leave', value: 'Leave the voice channel (joining happens automatically the first time you play something).' },
      { name: '/list tags', value: "See every tag your server's created." },
      { name: '🏷️ Tagging', value: 'Found a sound you want to save? Click the Tag button on any sound embed to name it for later.' }
    );
  return { embeds: [embed] };
}
