import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { NoticeModel } from '../notices/notice.model.js';
import { requireAuth, isAuthorizedForScope } from '../../middleware/auth.js';
import { aiRateLimiter } from '../../middleware/rateLimiter.js';
import { AppError } from '../../utils/errors.js';
import { activeAIProvider } from './ai.provider.js';
import { recordAuditLog } from '../audit-logs/auditLog.service.js';

export const aiRouter = Router();

// POST /api/ai/notices/:id/summarize
aiRouter.post(
  '/notices/:id/summarize',
  requireAuth,
  aiRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { language } = z
        .object({ language: z.enum(['en', 'bn']).default('en') })
        .parse(req.body || {});

      const notice = await NoticeModel.findById(req.params.id);
      if (!notice || notice.status !== 'published') {
        throw AppError.forbidden('AI summarization is only available for published notices.');
      }

      if (
        !isAuthorizedForScope(
          user,
          notice.targetClassIds.map(String),
          notice.targetCourseIds.map(String),
          'read'
        )
      ) {
        throw AppError.forbidden('You do not have permission to access this notice.');
      }

      // Return cached summary if notice version matches
      const cached = notice.aiSummary?.[language];
      if (cached && notice.aiSummaryVersion === notice.version) {
        res.json({
          success: true,
          data: {
            summary: cached,
            cached: true,
            noticeVersion: notice.version,
          },
        });
        return;
      }

      const generated = await activeAIProvider.summarizeNotice({
        title: notice.title,
        body: notice.body,
        category: notice.category,
        targetScope: 'CSE 60E',
        language,
      });

      const summaryRecord = {
        ...generated,
        generatedAt: new Date(),
      };

      notice.aiSummary = {
        ...(notice.aiSummary || {}),
        [language]: summaryRecord,
      };
      notice.aiSummaryLanguage = language;
      notice.aiSummaryVersion = notice.version;
      await notice.save();

      await recordAuditLog({
        actorId: user.id,
        actorRole: user.role,
        action: 'AI_NOTICE_SUMMARIZED',
        resourceType: 'ai',
        resourceId: String(notice._id),
        metadata: { language, version: notice.version },
      });

      res.json({
        success: true,
        data: {
          summary: summaryRecord,
          cached: false,
          noticeVersion: notice.version,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/ai/notices/:id/extract
aiRouter.post(
  '/notices/:id/extract',
  requireAuth,
  aiRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const notice = await NoticeModel.findById(req.params.id);
      if (!notice) throw AppError.notFound('Notice not found.');

      const isAuthor = String(notice.authorId) === user.id;
      if (notice.status !== 'published' && user.role !== 'admin' && !isAuthor) {
        throw AppError.forbidden('Unauthorized access to unpublished notice.');
      }

      if (
        !isAuthorizedForScope(
          user,
          notice.targetClassIds.map(String),
          notice.targetCourseIds.map(String),
          'read'
        ) &&
        !isAuthor
      ) {
        throw AppError.forbidden('You do not have permission to access this notice.');
      }

      const extracted = await activeAIProvider.extractStructuredInfo({
        title: notice.title,
        body: notice.body,
        category: notice.category,
        targetScope: 'CSE 60E',
      });

      notice.extractedInformation = extracted;
      await notice.save();

      await recordAuditLog({
        actorId: user.id,
        actorRole: user.role,
        action: 'AI_NOTICE_EXTRACTED',
        resourceType: 'ai',
        resourceId: String(notice._id),
      });

      res.json({
        success: true,
        data: {
          extractedInformation: extracted,
          requiresHumanApprovalForEvents: true,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/ai/ask
aiRouter.post(
  '/ask',
  requireAuth,
  aiRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { question, language } = z
        .object({
          question: z.string().min(3).max(500).trim(),
          language: z.enum(['en', 'bn']).default('en'),
        })
        .parse(req.body);

      // Strictly retrieve ONLY published notices authorized for the current user's classes
      const scopeQuery: Record<string, unknown> = { status: 'published' };
      if (user.role !== 'admin') {
        scopeQuery.$or = [
          { targetClassIds: { $size: 0 } },
          { targetClassIds: { $in: user.classMemberships.map((id) => new Types.ObjectId(id)) } },
        ];
      }

      const publishedNotices = await NoticeModel.find(scopeQuery)
        .sort({ isPinned: -1, publishedAt: -1 })
        .limit(15)
        .lean();

      const qaResult = await activeAIProvider.answerQuestion({
        question,
        language,
        authorizedNotices: publishedNotices.map((n) => ({
          id: String(n._id),
          title: n.title,
          body: n.body,
          category: n.category,
          publishedAt: n.publishedAt ? new Date(n.publishedAt).toISOString() : undefined,
        })),
      });

      await recordAuditLog({
        actorId: user.id,
        actorRole: user.role,
        action: 'AI_QUESTION_ASKED',
        resourceType: 'ai',
        resourceId: user.id,
        metadata: {
          language,
          sourceCount: qaResult.sources.length,
          hasSufficientInformation: qaResult.hasSufficientInformation,
        },
      });

      res.json({
        success: true,
        data: qaResult,
      });
    } catch (err) {
      next(err);
    }
  }
);
