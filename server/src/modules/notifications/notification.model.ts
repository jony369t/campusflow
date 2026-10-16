import mongoose, { Schema, Document, Types } from 'mongoose';

export type NotificationType =
  | 'NEW_NOTICE'
  | 'PINNED_ANNOUNCEMENT'
  | 'ROUTINE_CHANGE'
  | 'UPCOMING_EXAM'
  | 'ASSIGNMENT_DEADLINE'
  | 'ACADEMIC_EVENT';

export interface INotification extends Document {
  userId: Types.ObjectId;
  noticeId?: Types.ObjectId;
  eventId?: Types.ObjectId;
  dedupeKey: string;
  type: NotificationType;
  title: string;
  message: string;
  readAt?: Date | null;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    noticeId: { type: Schema.Types.ObjectId, ref: 'Notice' },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event' },
    dedupeKey: { type: String, required: true },
    type: {
      type: String,
      enum: [
        'NEW_NOTICE',
        'PINNED_ANNOUNCEMENT',
        'ROUTINE_CHANGE',
        'UPCOMING_EXAM',
        'ASSIGNMENT_DEADLINE',
        'ACADEMIC_EVENT',
      ],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Prevent duplicate notifications for the same publication event per user
notificationSchema.index({ userId: 1, dedupeKey: 1 }, { unique: true });
notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

export const NotificationModel =
  mongoose.models.Notification ||
  mongoose.model<INotification>('Notification', notificationSchema);
