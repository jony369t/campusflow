import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { RoutineEntryModel } from './routine.model.js';
import { requireAuth, requireRoles, isAuthorizedForScope } from '../../middleware/auth.js';
import { AppError } from '../../utils/errors.js';
import { recordAuditLog } from '../audit-logs/auditLog.service.js';
import { dispatchClassNotifications } from '../notifications/notification.service.js';

export const routineRouter = Router();

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function timesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  const sA = timeToMinutes(startA);
  const eA = timeToMinutes(endA);
  const sB = timeToMinutes(startB);
  const eB = timeToMinutes(endB);
  return sA < eB && sB < eA;
}

const routineSchema = z
  .object({
    classId: z.string().min(1),
    courseId: z.string().min(1),
    teacherId: z.string().min(1),
    dayOfWeek: z.enum([
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ]),
    startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Use HH:mm 24-hour format'),
    endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Use HH:mm 24-hour format'),
    room: z.string().min(1).max(80).trim(),
    recurrence: z.enum(['weekly', 'biweekly', 'makeup']).default('weekly'),
    effectiveFrom: z.string().datetime().optional(),
    effectiveUntil: z.string().datetime().optional(),
    status: z.enum(['published', 'draft', 'cancelled']).default('published'),
    changeNote: z.string().max(300).optional(),
  })
  .refine((data) => timeToMinutes(data.endTime) > timeToMinutes(data.startTime), {
    message: 'End time must be after start time',
    path: ['endTime'],
  });

routineRouter.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const classId = (req.query.classId as string) || user.classMemberships[0];
    const filter: Record<string, unknown> = { status: { $ne: 'cancelled' } };

    if (classId) {
      if (user.role === 'student' && !user.classMemberships.includes(classId)) {
        throw AppError.forbidden('You can only view the routine for your enrolled class.');
      }
      filter.classId = new Types.ObjectId(classId);
    }

    const entries = await RoutineEntryModel.find(filter)
      .populate('courseId', 'code title credits')
      .populate('teacherId', 'name designation officeRoom email publicContactApproved')
      .sort({ dayOfWeek: 1, startTime: 1 })
      .lean();

    res.json({ success: true, data: { entries } });
  } catch (err) {
    next(err);
  }
});

routineRouter.post(
  '/',
  requireAuth,
  requireRoles('cr'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const payload = routineSchema.parse(req.body);

      if (!isAuthorizedForScope(user, [payload.classId], [payload.courseId], 'write')) {
        throw AppError.forbidden('You are not authorized to modify routine entries for this class.');
      }

      // Check overlapping conflict within the same class and dayOfWeek
      const existingSameDay = await RoutineEntryModel.find({
        classId: new Types.ObjectId(payload.classId),
        dayOfWeek: payload.dayOfWeek,
        status: 'published',
      }).lean();

      const conflicting = existingSameDay.find((entry) =>
        timesOverlap(payload.startTime, payload.endTime, entry.startTime, entry.endTime)
      );

      if (conflicting) {
        throw AppError.conflict(
          `Schedule conflict detected: ${payload.dayOfWeek} ${payload.startTime}-${payload.endTime} overlaps with an existing routine slot (${conflicting.startTime}-${conflicting.endTime} in ${conflicting.room}).`,
          { conflictingEntryId: String(conflicting._id) }
        );
      }

      const created = await RoutineEntryModel.create({
        ...payload,
        classId: new Types.ObjectId(payload.classId),
        courseId: new Types.ObjectId(payload.courseId),
        teacherId: new Types.ObjectId(payload.teacherId),
        effectiveFrom: payload.effectiveFrom ? new Date(payload.effectiveFrom) : new Date(),
        effectiveUntil: payload.effectiveUntil ? new Date(payload.effectiveUntil) : undefined,
      });

      await recordAuditLog({
        actorId: user.id,
        actorRole: user.role,
        action: 'ROUTINE_ENTRY_CREATED',
        resourceType: 'routine',
        resourceId: String(created._id),
        metadata: { dayOfWeek: payload.dayOfWeek, startTime: payload.startTime, room: payload.room },
      });

      await dispatchClassNotifications({
        targetClassIds: [payload.classId],
        type: 'ROUTINE_CHANGE',
        title: `Routine Updated (${payload.dayOfWeek})`,
        message: `New slot added: ${payload.dayOfWeek} ${payload.startTime}-${payload.endTime} in Room ${payload.room}.`,
        dedupeKey: `routine-create-${created._id}`,
      });

      res.status(201).json({ success: true, data: { entry: created } });
    } catch (err) {
      next(err);
    }
  }
);

routineRouter.patch(
  '/:id',
  requireAuth,
  requireRoles('cr'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const entry = await RoutineEntryModel.findById(req.params.id);
      if (!entry) throw AppError.notFound('Routine entry not found.');

      if (
        !isAuthorizedForScope(
          user,
          [String(entry.classId)],
          [String(entry.courseId)],
          'write'
        )
      ) {
        throw AppError.forbidden('Not authorized to update this routine entry.');
      }

      const nextStart = (req.body.startTime as string) || entry.startTime;
      const nextEnd = (req.body.endTime as string) || entry.endTime;
      const nextDay = (req.body.dayOfWeek as string) || entry.dayOfWeek;

      if (timeToMinutes(nextEnd) <= timeToMinutes(nextStart)) {
        throw AppError.badRequest('End time must be after start time.');
      }

      const siblings = await RoutineEntryModel.find({
        _id: { $ne: entry._id },
        classId: entry.classId,
        dayOfWeek: nextDay,
        status: 'published',
      }).lean();

      const conflicting = siblings.find((s) =>
        timesOverlap(nextStart, nextEnd, s.startTime, s.endTime)
      );
      if (conflicting) {
        throw AppError.conflict(
          `Schedule conflict on ${nextDay}: ${nextStart}-${nextEnd} overlaps with ${conflicting.startTime}-${conflicting.endTime}.`
        );
      }

      Object.assign(entry, req.body);
      await entry.save();

      await recordAuditLog({
        actorId: user.id,
        actorRole: user.role,
        action: 'ROUTINE_ENTRY_UPDATED',
        resourceType: 'routine',
        resourceId: String(entry._id),
      });

      res.json({ success: true, data: { entry } });
    } catch (err) {
      next(err);
    }
  }
);

routineRouter.delete(
  '/:id',
  requireAuth,
  requireRoles('cr'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const entry = await RoutineEntryModel.findById(req.params.id);
      if (!entry) throw AppError.notFound('Routine entry not found.');

      if (
        !isAuthorizedForScope(
          user,
          [String(entry.classId)],
          [String(entry.courseId)],
          'write'
        )
      ) {
        throw AppError.forbidden('Not authorized to delete this routine entry.');
      }

      await entry.deleteOne();
      await recordAuditLog({
        actorId: user.id,
        actorRole: user.role,
        action: 'ROUTINE_ENTRY_DELETED',
        resourceType: 'routine',
        resourceId: String(entry._id),
      });

      res.json({ success: true, data: { deletedId: String(entry._id) } });
    } catch (err) {
      next(err);
    }
  }
);
