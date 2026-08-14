import cron from 'node-cron';
import logger, { formatError } from './logger';

type RunFn = () => Promise<void>;

export function startScheduler(cronExpression: string, run: RunFn): cron.ScheduledTask {
  const task = cron.schedule(cronExpression, async () => {
    logger.info(`Scheduled sync triggered (cron: ${cronExpression})`);
    try {
      await run();
    } catch (err) {
      logger.error(`Scheduled sync failed: ${formatError(err)}`);
    }
  });
  logger.info(`Scheduler started — next run at cron: ${cronExpression}`);
  return task;
}
