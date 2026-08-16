import { Collection } from 'discord.js';
import { BotCommand } from '../types/Command';
import playCommand from '../commands/play';
import joinCommand from '../commands/join';
import leaveCommand from '../commands/leave';
import listCommand from '../commands/list';

export const commands = new Collection<string, BotCommand>();
commands.set('play', playCommand);
commands.set('join', joinCommand);
commands.set('leave', leaveCommand);
commands.set('list', listCommand);
