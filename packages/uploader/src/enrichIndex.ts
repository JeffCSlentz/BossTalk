import logger from './logger';
import { loadEnrichmentConfig } from './config';
import { runEnrichment } from './enrichment/enrichmentRunner';
import { startScheduler } from './scheduler';

const runOnce = process.argv.includes('--run-once');
const creatureIdx = process.argv.indexOf('--creature');
const creatureFilter = creatureIdx >= 0 ? process.argv[creatureIdx + 1] : undefined;

async function main() {
  let config: ReturnType<typeof loadEnrichmentConfig>;
  try {
    config = loadEnrichmentConfig();
  } catch (err) {
    logger.error(err instanceof Error ? err : new Error(String(err)));
    process.exit(1);
  }

  const enrich = () => runEnrichment({ ...config, creatureFilter });

  // Always run once immediately on startup
  await enrich();

  if (runOnce) {
    logger.info('--run-once flag set, exiting after first enrichment pass');
    process.exit(0);
  }

  startScheduler(config.cron, enrich);
  logger.info('Enrichment runner running. Press Ctrl+C to stop.');
}

main().catch((err) => {
  logger.error(err instanceof Error ? err : new Error(String(err)));
  process.exit(1);
});
