import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
  actorId: Types.ObjectId;
  actorRole: string;
  action: string;
  resourceType: 'notice' | 'routine' | 'event' | 'user' | 'class' | 'course' | 'auth' | 'ai';
  resourceId: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

const auditLogSchema = new Schema<IAuditLog>({
  actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  actorRole: { type: String, required: true },
  action: { type: String, required: true, index: true },
  resourceType: {
    type: String,
    enum: ['notice', 'routine', 'event', 'user', 'class', 'course', 'auth', 'ai'],
    required: true,
    index: true,
  },
  resourceId: { type: String, required: true },
  timestamp: { type: Date, default: () => new Date(), index: true },
  metadata: { type: Schema.Types.Mixed },
});

auditLogSchema.index({ timestamp: -1, resourceType: 1 });

export const AuditLogModel =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
