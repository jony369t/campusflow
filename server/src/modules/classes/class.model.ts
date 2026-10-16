import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IClass extends Document {
  name: string;
  code: string;
  departmentId: Types.ObjectId;
  semester: string;
  academicYear: string;
  memberIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const classSchema = new Schema<IClass>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    semester: { type: String, required: true, trim: true },
    academicYear: { type: String, required: true, trim: true },
    memberIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

classSchema.index({ departmentId: 1, academicYear: -1 });

export const ClassModel =
  mongoose.models.Class || mongoose.model<IClass>('Class', classSchema);
