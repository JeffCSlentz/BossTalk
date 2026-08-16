import fs from 'fs';
import path from 'path';
import logger from '../logger';

const PIC_URLS_PATH = path.join(__dirname, '..', '..', 'data', 'picUrls.json');

export interface CreatureImage {
  img_url: string;
  wrong_pic_votes: number;
}

/**
 * Read-only lookup over data/picUrls.json, which is committed to the repo
 * (not gitignored, unlike guildTags/stats) and populated offline by
 * scripts/findPictures.ts. Kept as-is rather than replaced by an LLM-agent
 * image search, since that's not yet a proven-economical approach for this.
 */
export class PictureFinder {
  private picUrls = new Map<string, CreatureImage[]>();

  constructor() {
    if (!fs.existsSync(PIC_URLS_PATH)) {
      logger.warn(`${PIC_URLS_PATH} not found — creature thumbnails will be unavailable`);
      return;
    }
    try {
      const raw: [string, CreatureImage[]][] = JSON.parse(fs.readFileSync(PIC_URLS_PATH, 'utf8'));
      this.picUrls = new Map(raw);
      logger.info(`Loaded pictures for ${this.picUrls.size} creature(s)`);
    } catch (err) {
      logger.error(`Failed to load ${PIC_URLS_PATH}: ${err}`);
    }
  }

  getImageUrl(creatureName: string): string | undefined {
    const images = this.picUrls.get(creatureName);
    return images && images.length > 0 ? images[0].img_url : undefined;
  }
}
