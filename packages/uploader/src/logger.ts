import path from 'path';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logDir = path.join(process.cwd(), 'logs', 'uploader');

// Verbose by default when attached to an interactive terminal (manual runs) —
// quieter when run headless (Windows Scheduled Task). LOG_LEVEL always wins if set.
const defaultLevel = process.stdout.isTTY ? 'debug' : 'info';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? defaultLevel,
  format: winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
      const base = `${timestamp} [${level.toUpperCase()}] ${message}`;
      return stack ? `${base}\n${stack}` : base;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new DailyRotateFile({
      dirname: logDir,
      filename: 'uploader-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
      zippedArchive: true,
    }),
  ],
});

export default logger;

// Errors interpolated into a template string (`${err}`) lose their stack trace —
// Error.prototype.toString() only returns "Error: message". Use this wherever an
// error gets folded into a log message string, so the codepath survives in the log.
export function formatError(err: unknown): string {
  if (err instanceof Error) return err.stack ?? err.message;
  return String(err);
}
