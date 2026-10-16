import { Router, Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { NotificationModel } from './notification.model.js';
import { requireAuth } from '../../middleware/auth.js';
import { AppError } from '../../utils/errors.js';

export const notificationRouter = Router();

notificationRouter.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = new Types.ObjectId(req.user!.id);
    const [notifications, unreadCount] = await Promise.all([
      NotificationModel.find({ userId }).sort({ createdAt: -1 }).limit(50).lean(),
      NotificationModel.countDocuments({ userId, readAt: null }),
    ]);

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

notificationRouter.patch(
  '/:id/read',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = new Types.ObjectId(req.user!.id);
      if (req.params.id === 'all') {
        await NotificationModel.updateMany({ userId, readAt: null }, { $set: { readAt: new Date() } });
        res.json({ success: true, data: { markedAll: true } });
        return;
      }

      const notif = await NotificationModel.findOneAndUpdate(
        { _id: new Types.ObjectId(req.params.id), userId },
        { $set: { readAt: new Date() } },
        { new: true }
      );
      if (!notif) throw AppError.notFound('Notification not found.');

      res.json({ success: true, data: { notification: notif } });
    } catch (err) {
      next(err);
    }
  }
);
