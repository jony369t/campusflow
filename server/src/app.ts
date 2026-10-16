import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { noticeRouter } from './modules/notices/notice.routes.js';
import { routineRouter } from './modules/routine/routine.routes.js';
import { eventRouter } from './modules/events/event.routes.js';
import { notificationRouter } from './modules/notifications/notification.routes.js';
import { aiRouter } from './modules/ai/ai.routes.js';
import { academicRouter } from './modules/classes/academic.routes.js';
import { adminRouter } from './modules/users/admin.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser(env.COOKIE_SECRET));

  app.get('/api/health', (_req, res) => {
    res.json({
      success: true,
      data: {
        service: 'CampusFlow AI API',
        status: 'healthy',
        timezone: env.UNIVERSITY_TIMEZONE,
      },
    });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/notices', noticeRouter);
  app.use('/api/routine', routineRouter);
  app.use('/api/events', eventRouter);
  app.use('/api/notifications', notificationRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api', academicRouter);
  app.use('/api/admin', adminRouter);

  app.use(errorHandler);
  return app;
}
