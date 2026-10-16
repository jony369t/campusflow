import mongoose, { Schema, Document, Types } from 'mongoose';

export type NoticeCategory =
  | 'General'
  | 'Examination'
  | 'Assignment'
  | 'Class Routine'
  | 'Department'
  | 'Event'
  | 'Emergency';

export type NoticeStatus = 'draft' | 'pending_approval' | 'published' | 'rejected' | 'archived';

export interface INoticeAttachment {
  name: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
}

export interface IAISummaryRecord {
  mainAnnouncement: string;
  importantDateAndTime: string | null;
  requiredAction: string | null;
  relevantCourseOrClass: string;
  conditions: string[];
  language: 'en' | 'bn';
  generatedAt: Date;
}

export interface IExtractedNoticeInfo {
  eventDates: Array<{ label: string; isoDate: string | null; rawText: string; isAmbiguous: boolean }>;
  deadlines: Array<{ task: string; dueAt: string | null; rawText: string; isAmbiguous: boolean }>;
  courseCodes: string[];
  examinationTypes: string[];
  requiredActions: string[];
  relevantAudience: string;
  validatedByHuman: boolean;
}

export interface INotice extends Document {
  title: string;
  body: string;
  category: NoticeCategory;
  targetClassIds: Types.ObjectId[];
  targetCourseIds: Types.ObjectId[];
  attachments: INoticeAttachment[];
  authorId: Types.ObjectId;
  status: NoticeStatus;
  rejectionReason?: string;
  isPinned: boolean;
  publishedAt?: Date;
  expiresAt?: Date;
  eventDate?: Date;
  version: number;
  aiSummary?: {
    en?: IAISummaryRecord;
    bn?: IAISummaryRecord;
  };
  aiSummaryLanguage?: 'en' | 'bn';
  aiSummaryVersion?: number;
  extractedInformation?: IExtractedNoticeInfo;
  readCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const noticeSchema = new Schema<INotice>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, trim: true, maxlength: 15000 },
    category: {
      type: String,
      enum: [
        'General',
        'Examination',
        'Assignment',
        'Class Routine',
        'Department',
        'Event',
        'Emergency',
      ],
      required: true,
      index: true,
    },
    targetClassIds: [{ type: Schema.Types.ObjectId, ref: 'Class', index: true }],
    targetCourseIds: [{ type: Schema.Types.ObjectId, ref: 'Course', index: true }],
    attachments: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        mimeType: { type: String, required: true },
        sizeBytes: { type: Number, required: true, max: 5 * 1024 * 1024 },
      },
    ],
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['draft', 'pending_approval', 'published', 'rejected', 'archived'],
      default: 'draft',
      index: true,
    },
    rejectionReason: { type: String, trim: true },
    isPinned: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date, index: true },
    expiresAt: { type: Date, index: true },
    eventDate: { type: Date, index: true },
    version: { type: Number, default: 1 },
    aiSummary: { type: Schema.Types.Mixed },
    aiSummaryLanguage: { type: String, enum: ['en', 'bn'] },
    aiSummaryVersion: { type: Number },
    extractedInformation: { type: Schema.Types.Mixed },
    readCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

noticeSchema.index({ status: 1, targetClassIds: 1, isPinned: -1, publishedAt: -1 });
noticeSchema.index({ category: 1, status: 1, publishedAt: -1 });
noticeSchema.index({ title: 'text', body: 'text' });

export const NoticeModel =
  mongoose.models.Notice || mongoose.model<INotice>('Notice', noticeSchema);
