import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { NoticeModel } from './notice.model.js';
import { requireAuth, requireRoles, isAuthorizedForScope } from '../../middleware/auth.js';
import { AppError } from '../../utils/errors.js';
import { recordAuditLog } from '../audit-logs/auditLog.service.js';
import { dispatchClassNotifications } from '../notifications/notification.service.js';
import { env } from '../../config/env.js';

export const noticeRouter = Router();

const attachmentSchema = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url(),
  mimeType: z
    .string()
    .refine((m) => env.ALLOWED_ATTACHMENT_MIME_TYPES.includes(m), 'Unsupported attachment MIME type'),
  sizeBytes: z.number().int().positive().max(env.MAX_ATTACHMENT_SIZE_BYTES),
});

const createNoticeSchema = z.object({
  title: z.string().min(4).max(200).trim(),
  body: z.string().min(10).max(15000).trim(),
  category: z.enum([
    'General',
    'Examination',
    'Assignment',
    'Class Routine',
    'Department',
    'Event',
    'Emergency',
  ]),
  targetClassIds: z.array(z.string()).default([]),
  targetCourseIds: z.array(z.string()).default([]),
  attachments: z.array(attachmentSchema).max(5).default([]),
  isPinned: z.boolean().default(false),
  status: z.enum(['draft', 'pending_approval', 'published']).default('pending_approval'),
  expiresAt: z.string().datetime().optional(),
  eventDate: z.string().datetime().optional(),
});

const updateNoticeSchema = createNoticeSchema.partial();

// GET /api/notices — Paginated, filtered, and strictly scoped to user permissions
noticeRouter.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12));
    const category = req.query.category as string | undefined;
    const search = (req.query.search as string | undefined)?.trim();
    const statusFilter = req.query.status as string | undefined;

    const query: Record<string, unknown> = {};

    if (user.role === 'student') {
      query.status = 'published';
      query.$or = [
        { targetClassIds: { $size: 0 } },
        { targetClassIds: { $in: user.classMemberships.map((id) => new Types.ObjectId(id)) } },
      ];
    } else if (user.role === 'cr' || user.role === 'teacher') {
      if (statusFilter && statusFilter !== 'published') {
        query.status = statusFilter;
        query.authorId = new Types.ObjectId(user.id);
      } else {
        query.status = 'published';
        query.$or = [
          { targetClassIds: { $size: 0 } },
          { targetClassIds: { $in: user.classMemberships.map((id) => new Types.ObjectId(id)) } },
          { targetCourseIds: { $in: user.assignedCourseIds.map((id) => new Types.ObjectId(id)) } },
          { authorId: new Types.ObjectId(user.id) },
        ];
      }
    } else if (user.role === 'cr' && statusFilter) {
      query.status = statusFilter;
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    if (search) {
      query.$and = [
        ...(Array.isArray(query.$and) ? query.$and : []),
        {
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { body: { $regex: search, $options: 'i' } },
          ],
        },
      ];
    }

    const [items, total] = await Promise.all([
      NoticeModel.find(query)
        .sort({ isPinned: -1, publishedAt: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('authorId', 'name role designation')
        .lean(),
      NoticeModel.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/notices/:id — Single notice with object-level authorization
noticeRouter.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const notice = await NoticeModel.findById(req.params.id).populate(
      'authorId',
      'name role designation'
    );
    if (!notice) {
      throw AppError.notFound('Notice not found.');
    }

    const isAuthor = String(notice.authorId._id || notice.authorId) === user.id;
    if (notice.status !== 'published' && user.role !== 'cr' && !isAuthor) {
      throw AppError.forbidden('You are not authorized to view unpublished or private notices.');
    }

    const canRead = isAuthorizedForScope(
      user,
      notice.targetClassIds.map(String),
      notice.targetCourseIds.map(String),
      'read'
    );
    if (!canRead && !isAuthor) {
      throw AppError.forbidden('This notice belongs to a class or course outside your enrollment.');
    }

    notice.readCount = (notice.readCount || 0) + 1;
    await notice.save();

    res.json({ success: true, data: { notice } });
  } catch (err) {
    next(err);
  }
});

// POST /api/notices — Create notice (CR, Teacher, Admin)
noticeRouter.post(
  '/',
  requireAuth,
  requireRoles('cr'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const payload = createNoticeSchema.parse(req.body);

      const canWrite = isAuthorizedForScope(
        user,
        payload.targetClassIds,
        payload.targetCourseIds,
        'write'
      );
      if (!canWrite) {
        throw AppError.forbidden(
          'You may only create notices for classes or courses explicitly assigned to you.'
        );
      }

      // Enforce publishing permission rules: CRs without canPublishDirectly go to pending_approval
      let finalStatus = payload.status;
      if (
        finalStatus === 'published' &&
        user.role === 'cr' &&
        !user.canPublishDirectly
      ) {
        finalStatus = 'pending_approval';
      }

      const notice = await NoticeModel.create({
        ...payload,
        targetClassIds: payload.targetClassIds.map((id) => new Types.ObjectId(id)),
        targetCourseIds: payload.targetCourseIds.map((id) => new Types.ObjectId(id)),
        authorId: new Types.ObjectId(user.id),
        status: finalStatus,
        publishedAt: finalStatus === 'published' ? new Date() : undefined,
        expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : undefined,
        eventDate: payload.eventDate ? new Date(payload.eventDate) : undefined,
        version: 1,
      });

      await recordAuditLog({
        actorId: user.id,
        actorRole: user.role,
        action: 'NOTICE_CREATED',
        resourceType: 'notice',
        resourceId: String(notice._id),
        metadata: { status: finalStatus, category: notice.category },
      });

      if (finalStatus === 'published') {
        await dispatchClassNotifications({
          targetClassIds: payload.targetClassIds,
          type: notice.isPinned ? 'PINNED_ANNOUNCEMENT' : 'NEW_NOTICE',
          title: `New ${notice.category} Notice: ${notice.title}`,
          message: notice.body.slice(0, 140),
          dedupeKey: `notice-pub-${notice._id}-v1`,
          noticeId: String(notice._id),
        });
      }

      res.status(201).json({ success: true, data: { notice } });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/notices/:id — Edit notice and invalidate stale AI summary cache via version bump
noticeRouter.patch(
  '/:id',
  requireAuth,
  requireRoles('cr'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const notice = await NoticeModel.findById(req.params.id);
      if (!notice) throw AppError.notFound('Notice not found.');

      const isAuthor = String(notice.authorId) === user.id;
      if (user.role !== 'cr' && !isAuthor) {
        throw AppError.forbidden('You can only edit notices that you authored.');
      }

      const payload = updateNoticeSchema.parse(req.body);
      const contentChanged =
        (payload.title && payload.title !== notice.title) ||
        (payload.body && payload.body !== notice.body);

      Object.assign(notice, payload);
      if (contentChanged) {
        notice.version = (notice.version || 1) + 1;
        // Invalidate cached AI summary when notice text changes
        notice.aiSummary = undefined;
        notice.aiSummaryVersion = undefined;
      }

      await notice.save();

      await recordAuditLog({
        actorId: user.id,
        actorRole: user.role,
        action: 'NOTICE_UPDATED',
        resourceType: 'notice',
        resourceId: String(notice._id),
        metadata: { version: notice.version, contentChanged },
      });

      res.json({ success: true, data: { notice } });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/notices/:id/approve — Approve pending notice (Admin or authorized Teacher)
noticeRouter.post(
  '/:id/approve',
  requireAuth,
  requireRoles('cr'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const notice = await NoticeModel.findById(req.params.id);
      if (!notice) throw AppError.notFound('Notice not found.');

      notice.status = 'published';
      notice.publishedAt = new Date();
      await notice.save();

      await recordAuditLog({
        actorId: user.id,
        actorRole: user.role,
        action: 'NOTICE_APPROVED',
        resourceType: 'notice',
        resourceId: String(notice._id),
      });

      await dispatchClassNotifications({
        targetClassIds: notice.targetClassIds.map(String),
        type: notice.isPinned ? 'PINNED_ANNOUNCEMENT' : 'NEW_NOTICE',
        title: `Published: ${notice.title}`,
        message: notice.body.slice(0, 140),
        dedupeKey: `notice-pub-${notice._id}-v${notice.version}`,
        noticeId: String(notice._id),
      });

      res.json({ success: true, data: { notice } });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/notices/:id/reject — Reject notice
noticeRouter.post(
  '/:id/reject',
  requireAuth,
  requireRoles('cr'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { reason } = z
        .object({ reason: z.string().min(3).max(500).default('Requires revision') })
        .parse(req.body);

      const notice = await NoticeModel.findById(req.params.id);
      if (!notice) throw AppError.notFound('Notice not found.');

      notice.status = 'rejected';
      notice.rejectionReason = reason;
      await notice.save();

      await recordAuditLog({
        actorId: user.id,
        actorRole: user.role,
        action: 'NOTICE_REJECTED',
        resourceType: 'notice',
        resourceId: String(notice._id),
        metadata: { reason },
      });

      res.json({ success: true, data: { notice } });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/notices/:id — Delete notice
noticeRouter.delete(
  '/:id',
  requireAuth,
  requireRoles('cr'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const notice = await NoticeModel.findById(req.params.id);
      if (!notice) throw AppError.notFound('Notice not found.');

      if (user.role !== 'cr' && String(notice.authorId) !== user.id) {
        throw AppError.forbidden('Only an administrator or the original author may delete this notice.');
      }

      await notice.deleteOne();

      await recordAuditLog({
        actorId: user.id,
        actorRole: user.role,
        action: 'NOTICE_DELETED',
        resourceType: 'notice',
        resourceId: String(notice._id),
        metadata: { title: notice.title },
      });

      res.json({ success: true, data: { deletedId: String(notice._id) } });
    } catch (err) {
      next(err);
    }
  }
);
