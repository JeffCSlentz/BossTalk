import { S3Client, HeadObjectCommand, ListObjectsV2Command, HeadObjectCommandOutput } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import fs from 'fs';

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
}

export class R2Client {
  private s3: S3Client;
  private config: R2Config;

  constructor(config: R2Config) {
    this.config = config;
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  publicUrl(key: string): string {
    return `${this.config.publicUrl}/${key}`;
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.s3.send(new HeadObjectCommand({ Bucket: this.config.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  async head(key: string): Promise<HeadObjectCommandOutput | null> {
    try {
      return await this.s3.send(new HeadObjectCommand({ Bucket: this.config.bucket, Key: key }));
    } catch {
      return null;
    }
  }

  async upload(localPath: string, key: string, contentType = 'audio/ogg'): Promise<void> {
    const upload = new Upload({
      client: this.s3,
      params: {
        Bucket: this.config.bucket,
        Key: key,
        Body: fs.createReadStream(localPath),
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      },
    });
    await upload.done();
  }

  async listKeys(prefix = ''): Promise<string[]> {
    const keys: string[] = [];
    let continuationToken: string | undefined;

    do {
      const res = await this.s3.send(
        new ListObjectsV2Command({
          Bucket: this.config.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        })
      );
      for (const obj of res.Contents ?? []) {
        if (obj.Key) keys.push(obj.Key);
      }
      continuationToken = res.NextContinuationToken;
    } while (continuationToken);

    return keys;
  }
}
