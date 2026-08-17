import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import logger, { formatError } from '../logger';

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const STATS_PATH = path.join(DATA_DIR, 'statsData.json');
const R2_BACKUP_KEY = 'state/statsData.json';

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

export interface StatsConfig {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

/**
 * Buffers mutations in memory and flushes on an interval + on shutdown,
 * instead of a synchronous fs.writeFileSync on every single play/join/leave
 * event (the old behavior — write amplification with no real benefit, since
 * losing the last <flush interval> seconds of stats on an ungraceful crash
 * is an acceptable loss for a stats counter).
 *
 * Same durability pattern as GuildTags: local JSON is the authoritative,
 * fast store; a copy is pushed to R2 after every flush purely as a backstop
 * against losing the machine this runs on. R2 is never read from except at
 * boot when the local file is missing entirely.
 */
export class Stats {
  soundsPlayed = new Stat('Sounds Played');
  guilds = new Stat('Servers');
  commands = new Stat('Commands ran');

  private s3: S3Client;
  private bucket: string;
  private dirty = false;
  private timer?: NodeJS.Timeout;

  constructor(private flushIntervalSeconds = 45, config: StatsConfig) {
    this.bucket = config.bucket;
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    });
  }

  async init(): Promise<void> {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

    if (fs.existsSync(STATS_PATH)) {
      this.load(fs.readFileSync(STATS_PATH, 'utf8'));
      logger.info(`Loaded stats from local disk (${this.soundsPlayed.num} plays, ${this.commands.num} commands)`);
      return;
    }

    logger.warn('statsData.json missing locally — attempting restore from R2 backup');
    try {
      const res = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: R2_BACKUP_KEY }));
      const body = (await res.Body?.transformToString()) ?? '{}';
      this.load(body);
      fs.writeFileSync(STATS_PATH, body);
      logger.info('Restored stats from R2 backup');
    } catch (err) {
      logger.info(`No R2 backup found either — starting empty (${formatError(err)})`);
    }
  }

  private load(json: string): void {
    try {
      const saved = JSON.parse(json);
      if (saved.soundsPlayed) Object.assign(this.soundsPlayed, saved.soundsPlayed);
      if (saved.guilds) Object.assign(this.guilds, saved.guilds);
      if (saved.commands) Object.assign(this.commands, saved.commands);
    } catch (err) {
      logger.warn(`Couldn't parse stats file, starting fresh: ${formatError(err)}`);
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

  commandRan(userId: string, username: string, commandName: string): void {
    this.commands.update(1, { at: Date.now(), userId, username, commandName });
    this.dirty = true;
  }

  getStatsMessage(): string[] {
    return [
      `I've played **${this.soundsPlayed.num}** sounds.`,
      `I'm in **${this.guilds.num}** servers.`,
      `I've run **${this.commands.num}** commands.`,
    ];
  }

  flush(): void {
    if (!this.dirty) return;
    this.flushSync();
  }

  private flushSync(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      const json = JSON.stringify({ soundsPlayed: this.soundsPlayed, guilds: this.guilds, commands: this.commands });
      fs.writeFileSync(STATS_PATH, json);
      this.dirty = false;
      this.s3
        .send(new PutObjectCommand({ Bucket: this.bucket, Key: R2_BACKUP_KEY, Body: json, ContentType: 'application/json' }))
        .catch((err) => logger.warn(`Failed to back up stats to R2: ${formatError(err)}`));
    } catch (err) {
      logger.error(`Failed to flush stats: ${formatError(err)}`);
    }
  }
}
