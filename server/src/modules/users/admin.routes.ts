import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { UserModel } from './user.model.js';
import { AuditLogModel } from '../audit-logs/auditLog.model.js';
import { requireAuth, requireRoles } from '../../middleware/auth.js';
import { AppError } from '../../utils/errors.js';
import { recordAuditLog } from '../audit-logs/auditLog.service.js';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRoles('cr'));

adminRouter.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const role = req.query.role as string | undefined;
    const filter: Record<string, unknown> = {};
    if (role) filter.role = role;

    const users = await UserModel.find(filter)
      .populate('departmentId', 'name code')
      .populate('classMemberships', 'name code')
      .populate('assignedCourseIds', 'code title')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: { users } });
  } catch (err) {
    next(err);
  }
});

const updateUserAdminSchema = z.object({
  role: z.enum(['student', 'cr', 'teacher', 'admin']).optional(),
  isActive: z.boolean().optional(),
  canPublishDirectly: z.boolean().optional(),
  publicContactApproved: z.boolean().optional(),
  classMemberships: z.array(z.string()).optional(),
  assignedCourseIds: z.array(z.string()).optional(),
});

adminRouter.patch('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = updateUserAdminSchema.parse(req.body);
    const user = await UserModel.findById(req.params.id);
    if (!user) throw AppError.notFound('User not found.');

    if (payload.role) user.role = payload.role;
    if (typeof payload.isActive === 'boolean') user.isActive = payload.isActive;
    if (typeof payload.canPublishDirectly === 'boolean') {
      user.canPublishDirectly = payload.canPublishDirectly;
    }
    if (typeof payload.publicContactApproved === 'boolean') {
      user.publicContactApproved = payload.publicContactApproved;
    }
    if (payload.classMemberships) {
      user.classMemberships = payload.classMemberships.map((id) => new Types.ObjectId(id));
    }
    if (payload.assignedCourseIds) {
      user.assignedCourseIds = payload.assignedCourseIds.map((id) => new Types.ObjectId(id));
    }

    await user.save();

    await recordAuditLog({
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action: 'ADMIN_USER_UPDATED',
      resourceType: 'user',
      resourceId: String(user._id),
      metadata: payload,
    });

    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/audit-logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const logs = await AuditLogModel.find()
      .populate('actorId', 'name email role')
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    res.json({ success: true, data: { logs } });
  } catch (err) {
    next(err);
  }
});
