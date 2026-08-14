import logger from './logger';
import { loadConfig } from './config';
import { runSync } from './runner';
import { startScheduler } from './scheduler';

const runOnce = process.argv.includes('--run-once');
const dryRun = process.argv.includes('--dry-run');
const forceReindex = process.argv.includes('--force');
const creatureIdx = process.argv.indexOf('--creature');
const creatureFilter = creatureIdx >= 0 ? process.argv[creatureIdx + 1] : undefined;

async function main() {
  if (dryRun) logger.info('DRY RUN — no files will be uploaded or indexed');

  let config: ReturnType<typeof loadConfig>;
  try {
    config = loadConfig({ dryRun });
  } catch (err) {
    logger.error(err instanceof Error ? err : new Error(String(err)));
    process.exit(1);
  }

  const sync = () => runSync({ ...config, dryRun, creatureFilter, forceReindex });

  // Always run once immediately on startup
  await sync();

  if (runOnce) {
    logger.info('--run-once flag set, exiting after first sync');
    process.exit(0);
  }

  startScheduler(config.cron, sync);
  logger.info('Uploader running. Press Ctrl+C to stop.');
}

main().catch((err) => {
  logger.error(err instanceof Error ? err : new Error(String(err)));
  process.exit(1);
});
