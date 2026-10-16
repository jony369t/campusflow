import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { EventModel } from './event.model.js';
import { requireAuth, requireRoles, isAuthorizedForScope } from '../../middleware/auth.js';
import { AppError } from '../../utils/errors.js';
import { recordAuditLog } from '../audit-logs/auditLog.service.js';
import { dispatchClassNotifications } from '../notifications/notification.service.js';

export const eventRouter = Router();

const createEventSchema = z
  .object({
    title: z.string().min(3).max(200).trim(),
    description: z.string().min(5).max(4000).trim(),
    type: z.enum([
      'CT Examination',
      'Midterm Examination',
      'Final Examination',
      'Assignment Deadline',
      'Presentation',
      'Lab Assessment',
      'University Event',
      'Holiday',
    ]),
    classIds: z.array(z.string()).default([]),
    courseIds: z.array(z.string()).default([]),
    location: z.string().max(120).optional(),
    startAt: z.string().datetime({ message: 'Valid ISO startAt timestamp is required' }),
    endAt: z.string().datetime().optional(),
    sourceNoticeId: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.endAt) return true;
      return new Date(data.endAt).getTime() >= new Date(data.startAt).getTime();
    },
    { message: 'Event endAt cannot be earlier than startAt', path: ['endAt'] }
  );

eventRouter.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const filter: Record<string, unknown> = {};

    if (user.role === 'student') {
      filter.approvalStatus = 'approved';
      filter.$or = [
        { classIds: { $size: 0 } },
        { classIds: { $in: user.classMemberships.map((id) => new Types.ObjectId(id)) } },
      ];
    } else if (user.role !== 'cr') {
      filter.$or = [
        { classIds: { $size: 0 } },
        { classIds: { $in: user.classMemberships.map((id) => new Types.ObjectId(id)) } },
        { courseIds: { $in: user.assignedCourseIds.map((id) => new Types.ObjectId(id)) } },
      ];
    }

    if (req.query.type) {
      filter.type = req.query.type;
    }

    const events = await EventModel.find(filter)
      .populate('courseIds', 'code title')
      .populate('createdBy', 'name role')
      .sort({ startAt: 1 })
      .lean();

    res.json({ success: true, data: { events } });
  } catch (err) {
    next(err);
  }
});

eventRouter.post(
  '/',
  requireAuth,
  requireRoles('cr'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const payload = createEventSchema.parse(req.body);

      if (!isAuthorizedForScope(user, payload.classIds, payload.courseIds, 'write')) {
        throw AppError.forbidden('You are not authorized to create academic events for this scope.');
      }

      const startDate = new Date(payload.startAt);
      const dayStart = new Date(startDate);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(startDate);
      dayEnd.setUTCHours(23, 59, 59, 999);

      // Flag conflicting or duplicate events on the same day for the same class
      const sameDayEvents = await EventModel.find({
        classIds: { $in: payload.classIds.map((id) => new Types.ObjectId(id)) },
        startAt: { $gte: dayStart, $lte: dayEnd },
      }).lean();

      const hasConflictFlag = sameDayEvents.length > 0;
      const conflictReason = hasConflictFlag
        ? `Shares date with ${sameDayEvents.map((e) => e.title).join(', ')}`
        : undefined;

      const approvalStatus =
        user.role === 'cr' || user.role === 'teacher' || user.canPublishDirectly
          ? 'approved'
          : 'pending';

      const event = await EventModel.create({
        title: payload.title,
        description: payload.description,
        type: payload.type,
        classIds: payload.classIds.map((id) => new Types.ObjectId(id)),
        courseIds: payload.courseIds.map((id) => new Types.ObjectId(id)),
        location: payload.location,
        startAt: startDate,
        endAt: payload.endAt ? new Date(payload.endAt) : undefined,
        createdBy: new Types.ObjectId(user.id),
        approvalStatus,
        hasConflictFlag,
        conflictReason,
        sourceNoticeId: payload.sourceNoticeId
          ? new Types.ObjectId(payload.sourceNoticeId)
          : undefined,
      });

      await recordAuditLog({
        actorId: user.id,
        actorRole: user.role,
        action: 'EVENT_CREATED',
        resourceType: 'event',
        resourceId: String(event._id),
        metadata: { type: event.type, hasConflictFlag, approvalStatus },
      });

      if (approvalStatus === 'approved') {
        const notifType =
          event.type.includes('Examination')
            ? 'UPCOMING_EXAM'
            : event.type === 'Assignment Deadline'
            ? 'ASSIGNMENT_DEADLINE'
            : 'ACADEMIC_EVENT';

        await dispatchClassNotifications({
          targetClassIds: payload.classIds,
          type: notifType,
          title: `${event.type}: ${event.title}`,
          message: `Scheduled for ${startDate.toISOString().slice(0, 10)} — ${event.description.slice(0, 100)}`,
          dedupeKey: `event-pub-${event._id}`,
          eventId: String(event._id),
        });
      }

      res.status(201).json({ success: true, data: { event } });
    } catch (err) {
      next(err);
    }
  }
);

eventRouter.patch(
  '/:id',
  requireAuth,
  requireRoles('cr'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const event = await EventModel.findById(req.params.id);
      if (!event) throw AppError.notFound('Academic event not found.');

      if (user.role !== 'cr' && String(event.createdBy) !== user.id) {
        throw AppError.forbidden('Only an administrator or the event creator may update this event.');
      }

      if (req.body.startAt && req.body.endAt) {
        if (new Date(req.body.endAt).getTime() < new Date(req.body.startAt).getTime()) {
          throw AppError.badRequest('Event endAt cannot be earlier than startAt.');
        }
      }

      Object.assign(event, req.body);
      await event.save();

      await recordAuditLog({
        actorId: user.id,
        actorRole: user.role,
        action: 'EVENT_UPDATED',
        resourceType: 'event',
        resourceId: String(event._id),
      });

      res.json({ success: true, data: { event } });
    } catch (err) {
      next(err);
    }
  }
);

eventRouter.delete(
  '/:id',
  requireAuth,
  requireRoles('cr'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const event = await EventModel.findById(req.params.id);
      if (!event) throw AppError.notFound('Academic event not found.');

      if (user.role !== 'cr' && String(event.createdBy) !== user.id) {
        throw AppError.forbidden('Only an administrator or the event creator may delete this event.');
      }

      await event.deleteOne();
      await recordAuditLog({
        actorId: user.id,
        actorRole: user.role,
        action: 'EVENT_DELETED',
        resourceType: 'event',
        resourceId: String(event._id),
      });

      res.json({ success: true, data: { deletedId: String(event._id) } });
    } catch (err) {
      next(err);
    }
  }
);
