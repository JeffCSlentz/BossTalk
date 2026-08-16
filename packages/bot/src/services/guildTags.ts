import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Tag, tagSort } from '../types/Tag';
import logger, { formatError } from '../logger';

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const LOCAL_PATH = path.join(DATA_DIR, 'guildTags.json');
const R2_BACKUP_KEY = 'state/guildTags.json';

export interface GuildTagsConfig {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

export function changedEvent(guildId: string): string {
  return `changed:${guildId}`;
}

/**
 * Local JSON is the authoritative, fast store (same pattern as before this
 * migration — it already survives a git-pull+restart deploy since data/ is
 * gitignored). A copy is pushed to R2 after every write purely as a
 * durability backstop against losing the machine this runs on; R2 is never
 * read from except at boot when the local file is missing entirely.
 */
export class GuildTags extends EventEmitter {
  private data: Record<string, Tag[]> = {};
  private s3: S3Client;
  private bucket: string;

  constructor(config: GuildTagsConfig) {
    super();
    this.bucket = config.bucket;
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    });
  }

  async init(): Promise<void> {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

    if (fs.existsSync(LOCAL_PATH)) {
      this.data = JSON.parse(fs.readFileSync(LOCAL_PATH, 'utf8'));
      logger.info(`Loaded guild tags for ${Object.keys(this.data).length} guild(s) from local disk`);
      return;
    }

    logger.warn('guildTags.json missing locally — attempting restore from R2 backup');
    try {
      const res = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: R2_BACKUP_KEY }));
      const body = (await res.Body?.transformToString()) ?? '{}';
      this.data = JSON.parse(body);
      fs.writeFileSync(LOCAL_PATH, body);
      logger.info('Restored guild tags from R2 backup');
    } catch (err) {
      logger.info(`No R2 backup found either — starting empty (${formatError(err)})`);
      this.data = {};
    }
  }

  get(guildId: string): Tag[] {
    return [...(this.data[guildId] ?? [])].sort(tagSort);
  }

  add(guildId: string, tag: string, r2Url: string, author: string): Tag {
    const newTag: Tag = { tag, r2Url, author };
    if (!this.data[guildId]) this.data[guildId] = [];
    this.data[guildId].push(newTag);
    this.persist();
    this.emit(changedEvent(guildId));
    return newTag;
  }

  remove(guildId: string, index: number): void {
    const tags = this.get(guildId);
    const removed = tags[index];
    if (!removed) return;
    const rawIndex = this.data[guildId].findIndex((t) => t.tag === removed.tag && t.r2Url === removed.r2Url);
    if (rawIndex >= 0) this.data[guildId].splice(rawIndex, 1);
    this.persist();
    this.emit(changedEvent(guildId));
  }

  private persist(): void {
    const json = JSON.stringify(this.data);
    fs.writeFileSync(LOCAL_PATH, json);
    this.s3
      .send(new PutObjectCommand({ Bucket: this.bucket, Key: R2_BACKUP_KEY, Body: json, ContentType: 'application/json' }))
      .catch((err) => logger.warn(`Failed to back up guild tags to R2: ${formatError(err)}`));
  }
}
