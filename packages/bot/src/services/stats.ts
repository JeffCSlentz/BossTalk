import fs from 'fs';
import path from 'path';
import logger, { formatError } from '../logger';

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const STATS_PATH = path.join(DATA_DIR, 'statsData.json');

interface StatEvent {
  at: number;
  [key: string]: unknown;
}

class Stat {
  name: string;
  num: number;
  events: StatEvent[] = [];

  constructor(name: string, num = 0) {
    this.name = name;
    this.num = num;
  }

  update(n: number, event: StatEvent): void {
    this.num += n;
    this.events.push(event);
  }
}

/**
 * Buffers mutations in memory and flushes on an interval + on shutdown,
 * instead of a synchronous fs.writeFileSync on every single play/join/leave
 * event (the old behavior — write amplification with no real benefit, since
 * losing the last <flush interval> seconds of stats on an ungraceful crash
 * is an acceptable loss for a stats counter).
 */
export class Stats {
  soundsPlayed = new Stat('Sounds Played');
  guilds = new Stat('Servers');

  private dirty = false;
  private timer?: NodeJS.Timeout;

  constructor(private flushIntervalSeconds = 45) {
    if (fs.existsSync(STATS_PATH)) {
      try {
        const saved = JSON.parse(fs.readFileSync(STATS_PATH, 'utf8'));
        if (saved.soundsPlayed) Object.assign(this.soundsPlayed, saved.soundsPlayed);
        if (saved.guilds) Object.assign(this.guilds, saved.guilds);
      } catch (err) {
        logger.warn(`Couldn't load stats file, starting fresh: ${formatError(err)}`);
      }
    }
  }

  start(): void {
    this.timer = setInterval(() => this.flush(), this.flushIntervalSeconds * 1000);
    this.timer.unref();
    const flushAndExit = () => this.flushSync();
    process.once('SIGINT', flushAndExit);
    process.once('SIGTERM', flushAndExit);
  }

  playedSound(guildId: string, userId: string, username: string, objectID: string): void {
    this.soundsPlayed.update(1, { at: Date.now(), guildId, userId, username, objectID });
    this.dirty = true;
  }

  addGuild(guildId: string, guildName: string): void {
    this.guilds.update(1, { at: Date.now(), guildId, guildName });
    this.dirty = true;
  }

  removeGuild(guildId: string, guildName: string): void {
    this.guilds.update(-1, { at: Date.now(), guildId, guildName });
    this.dirty = true;
  }

  getStatsMessage(): string[] {
    return [`I've played **${this.soundsPlayed.num}** sounds.`, `I'm in **${this.guilds.num}** servers.`];
  }

  flush(): void {
    if (!this.dirty) return;
    this.flushSync();
  }

  private flushSync(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(STATS_PATH, JSON.stringify({ soundsPlayed: this.soundsPlayed, guilds: this.guilds }));
      this.dirty = false;
    } catch (err) {
      logger.error(`Failed to flush stats: ${formatError(err)}`);
    }
  }
}
