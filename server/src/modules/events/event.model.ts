import mongoose, { Schema, Document, Types } from 'mongoose';

export type AcademicEventType =
  | 'CT Examination'
  | 'Midterm Examination'
  | 'Final Examination'
  | 'Assignment Deadline'
  | 'Presentation'
  | 'Lab Assessment'
  | 'University Event'
  | 'Holiday';

export interface IAcademicEvent extends Document {
  title: string;
  description: string;
  type: AcademicEventType;
  classIds: Types.ObjectId[];
  courseIds: Types.ObjectId[];
  location?: string;
  startAt: Date;
  endAt?: Date;
  createdBy: Types.ObjectId;
  approvalStatus: 'approved' | 'pending' | 'rejected';
  hasConflictFlag: boolean;
  conflictReason?: string;
  sourceNoticeId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IAcademicEvent>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 4000 },
    type: {
      type: String,
      enum: [
        'CT Examination',
        'Midterm Examination',
        'Final Examination',
        'Assignment Deadline',
        'Presentation',
        'Lab Assessment',
        'University Event',
        'Holiday',
      ],
      required: true,
      index: true,
    },
    classIds: [{ type: Schema.Types.ObjectId, ref: 'Class', index: true }],
    courseIds: [{ type: Schema.Types.ObjectId, ref: 'Course', index: true }],
    location: { type: String, trim: true },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvalStatus: {
      type: String,
      enum: ['approved', 'pending', 'rejected'],
      default: 'approved',
      index: true,
    },
    hasConflictFlag: { type: Boolean, default: false },
    conflictReason: { type: String, trim: true },
    sourceNoticeId: { type: Schema.Types.ObjectId, ref: 'Notice' },
  },
  { timestamps: true }
);

eventSchema.index({ classIds: 1, approvalStatus: 1, startAt: 1 });

export const EventModel =
  mongoose.models.Event || mongoose.model<IAcademicEvent>('Event', eventSchema);
