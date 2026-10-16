import mongoose, { Schema, Document, Types } from 'mongoose';

export type DayOfWeek =
  | 'Sunday'
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday';

export interface IRoutineEntry extends Document {
  classId: Types.ObjectId;
  courseId: Types.ObjectId;
  teacherId: Types.ObjectId;
  dayOfWeek: DayOfWeek;
  startTime: string; // HH:mm (24-hour format in university timezone)
  endTime: string;   // HH:mm
  room: string;
  recurrence: 'weekly' | 'biweekly' | 'makeup';
  effectiveFrom: Date;
  effectiveUntil?: Date;
  status: 'published' | 'draft' | 'cancelled';
  changeNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const routineEntrySchema = new Schema<IRoutineEntry>(
  {
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dayOfWeek: {
      type: String,
      enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      required: true,
      index: true,
    },
    startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):([0-5]\d)$/ },
    endTime: { type: String, required: true, match: /^([01]\d|2[0-3]):([0-5]\d)$/ },
    room: { type: String, required: true, trim: true },
    recurrence: { type: String, enum: ['weekly', 'biweekly', 'makeup'], default: 'weekly' },
    effectiveFrom: { type: Date, required: true, default: () => new Date() },
    effectiveUntil: { type: Date },
    status: {
      type: String,
      enum: ['published', 'draft', 'cancelled'],
      default: 'published',
      index: true,
    },
    changeNote: { type: String, trim: true },
  },
  { timestamps: true }
);

routineEntrySchema.index({ classId: 1, dayOfWeek: 1, startTime: 1, status: 1 });

export const RoutineEntryModel =
  mongoose.models.RoutineEntry || mongoose.model<IRoutineEntry>('RoutineEntry', routineEntrySchema);
