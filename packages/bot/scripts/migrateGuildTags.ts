// One-time migration for guild tags from the old {tag, filePath, author} shape
// (VPS-only, gitignored, never present in this repo) to the new
// {tag, r2Url, author} shape. Run by hand against a COPY of the production
// file — never touches the live file, never runs automatically.
//
// Usage: npm run migrate-guild-tags -- <path-to-copy-of-guildTags.json>
import '../src/loadEnv';
import fs from 'fs';
import path from 'path';
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import { soundFromFilePath } from '@bosstalk/shared';

interface OldTag {
  tag: string;
  filePath: string;
  author: string;
}

interface NewTag {
  tag: string;
  r2Url: string;
  author: string;
}

async function main(): Promise<void> {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error('Usage: npm run migrate-guild-tags -- <path-to-copy-of-guildTags.json>');
    process.exit(1);
  }

  const accountId = process.env.R2_ACCOUNT_ID!;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID!;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!;
  const bucket = process.env.R2_BUCKET ?? 'bosstalk-sounds';
  const publicUrl = process.env.R2_PUBLIC_URL ?? 'https://cdn.bosstalk.io';

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  async function existsInR2(key: string): Promise<boolean> {
    try {
      await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  // Old format was a Discord.Collection serialized as an array of [guildId, Tag[]] pairs.
  const raw: [string, OldTag[]][] = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

  const migrated: Record<string, NewTag[]> = {};
  const unresolved: { guildId: string; tag: string; filePath: string }[] = [];

  for (const [guildId, tags] of raw) {
    migrated[guildId] = [];
    for (const oldTag of tags) {
      const sound = soundFromFilePath(oldTag.filePath);
      const found = await existsInR2(sound.fileKey);
      if (!found) {
        unresolved.push({ guildId, tag: oldTag.tag, filePath: oldTag.filePath });
        continue;
      }
      migrated[guildId].push({ tag: oldTag.tag, r2Url: `${publicUrl}/${sound.fileKey}`, author: oldTag.author });
    }
  }

  const outputPath = path.join(path.dirname(inputPath), 'guildTags.migrated.json');
  fs.writeFileSync(outputPath, JSON.stringify(migrated, null, 2));

  console.log(`Wrote ${outputPath}`);
  console.log(`${unresolved.length} tag(s) could not be resolved against R2 (naming may have drifted — check by hand):`);
  for (const u of unresolved) {
    console.log(`  guild ${u.guildId}: "${u.tag}" -> ${u.filePath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
