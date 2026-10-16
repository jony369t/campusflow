import { createApp } from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

async function bootstrap() {
  await connectDatabase();
  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info(`CampusFlow AI server listening on port ${env.PORT}`, {
      timezone: env.UNIVERSITY_TIMEZONE,
      env: env.NODE_ENV,
    });
  });
}

bootstrap().catch((err) => {
  logger.error('Fatal server startup failure', {
    error: err instanceof Error ? err.message : 'Unknown error',
  });
  process.exit(1);
});
