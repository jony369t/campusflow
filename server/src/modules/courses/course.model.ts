import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICourse extends Document {
  code: string;
  title: string;
  credits: number;
  departmentId: Types.ObjectId;
  assignedTeacherIds: Types.ObjectId[];
  classIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const courseSchema = new Schema<ICourse>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    title: { type: String, required: true, trim: true },
    credits: { type: Number, default: 3.0, min: 0.5, max: 6.0 },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    assignedTeacherIds: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    classIds: [{ type: Schema.Types.ObjectId, ref: 'Class', index: true }],
  },
  { timestamps: true }
);

export const CourseModel =
  mongoose.models.Course || mongoose.model<ICourse>('Course', courseSchema);
