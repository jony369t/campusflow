import mongoose, { Schema, Document, Types } from 'mongoose';

export type UserRole = 'student' | 'cr';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  studentId?: string;
  designation?: string;
  officeRoom?: string;
  publicContactApproved: boolean;
  role: UserRole;
  departmentId?: Types.ObjectId;
  classMemberships: Types.ObjectId[];
  assignedCourseIds: Types.ObjectId[];
  canPublishDirectly: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    studentId: { type: String, trim: true, sparse: true },
    designation: { type: String, trim: true },
    officeRoom: { type: String, trim: true },
    publicContactApproved: { type: Boolean, default: false, index: true },
    role: {
      type: String,
      enum: ['student', 'cr'],
      required: true,
      default: 'student',
      index: true,
    },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', index: true },
    classMemberships: [{ type: Schema.Types.ObjectId, ref: 'Class', index: true }],
    assignedCourseIds: [{ type: Schema.Types.ObjectId, ref: 'Course', index: true }],
    canPublishDirectly: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ classMemberships: 1, role: 1 });

export const UserModel = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
