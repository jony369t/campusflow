import { Types } from 'mongoose';
import { NotificationModel, NotificationType } from './notification.model.js';
import { UserModel } from '../users/user.model.js';

export async function dispatchClassNotifications(params: {
  targetClassIds: string[];
  type: NotificationType;
  title: string;
  message: string;
  dedupeKey: string;
  noticeId?: string;
  eventId?: string;
}): Promise<number> {
  const filter: Record<string, unknown> = { isActive: true };
  if (params.targetClassIds.length > 0) {
    filter.classMemberships = {
      $in: params.targetClassIds.map((id) => new Types.ObjectId(id)),
    };
  }

  const recipients = await UserModel.find(filter).select('_id').lean();
  if (recipients.length === 0) return 0;

  const ops = recipients.map((u) => ({
    updateOne: {
      filter: { userId: u._id, dedupeKey: params.dedupeKey },
      update: {
        $setOnInsert: {
          userId: u._id,
          dedupeKey: params.dedupeKey,
          type: params.type,
          title: params.title,
          message: params.message,
          ...(params.noticeId ? { noticeId: new Types.ObjectId(params.noticeId) } : {}),
          ...(params.eventId ? { eventId: new Types.ObjectId(params.eventId) } : {}),
          readAt: null,
          createdAt: new Date(),
        },
      },
      upsert: true,
    },
  }));

  const res = await NotificationModel.bulkWrite(ops, { ordered: false });
  return res.upsertedCount;
}
