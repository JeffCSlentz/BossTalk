import path from 'path';
import dotenv from 'dotenv';

// Side-effect-only module — import this first (before anything that reads
// process.env at module-load time, e.g. logger.ts's LOG_LEVEL) to guarantee
// .env is loaded regardless of which module happens to import it first.
dotenv.config({ path: path.join(__dirname, '..', '.env') });
