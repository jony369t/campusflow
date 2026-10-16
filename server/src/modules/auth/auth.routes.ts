import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { UserModel } from '../users/user.model.js';
import { AppError } from '../../utils/errors.js';
import {
  requireAuth,
  SESSION_COOKIE_NAME,
  CSRF_COOKIE_NAME,
} from '../../middleware/auth.js';
import { authRateLimiter } from '../../middleware/rateLimiter.js';
import { recordAuditLog } from '../audit-logs/auditLog.service.js';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email('Please enter a valid university email address').trim().toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

authRouter.post(
  '/login',
  authRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      if (env.ENFORCE_UNIVERSITY_EMAIL_DOMAIN) {
        const domain = email.split('@')[1]?.toLowerCase();
        if (!domain || !env.APPROVED_EMAIL_DOMAINS.includes(domain)) {
          throw AppError.forbidden(
            `Email domain must belong to an approved university domain (${env.APPROVED_EMAIL_DOMAINS.join(', ')}).`
          );
        }
      }

      const user = await UserModel.findOne({ email }).select('+passwordHash');
      if (!user || !user.isActive) {
        throw AppError.unauthorized('Invalid email or password.');
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        throw AppError.unauthorized('Invalid email or password.');
      }

      const csrfToken = crypto.randomBytes(24).toString('hex');
      const token = jwt.sign(
        { sub: String(user._id), role: user.role, csrf: csrfToken },
        env.JWT_SECRET,
        { expiresIn: `${env.SESSION_TTL_HOURS}h` }
      );

      const maxAgeMs = env.SESSION_TTL_HOURS * 60 * 60 * 1000;
      res.cookie(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: 'lax',
        maxAge: maxAgeMs,
      });

      res.cookie(CSRF_COOKIE_NAME, csrfToken, {
        httpOnly: false,
        secure: env.COOKIE_SECURE,
        sameSite: 'lax',
        maxAge: maxAgeMs,
      });

      await recordAuditLog({
        actorId: String(user._id),
        actorRole: user.role,
        action: 'USER_LOGIN',
        resourceType: 'auth',
        resourceId: String(user._id),
      });

      res.json({
        success: true,
        data: {
          csrfToken,
          user: {
            id: String(user._id),
            name: user.name,
            email: user.email,
            role: user.role,
            studentId: user.studentId,
            designation: user.designation,
            departmentId: user.departmentId,
            classMemberships: user.classMemberships,
            assignedCourseIds: user.assignedCourseIds,
            canPublishDirectly: user.canPublishDirectly,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

authRouter.post('/logout', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.clearCookie(SESSION_COOKIE_NAME);
    res.clearCookie(CSRF_COOKIE_NAME);
    if (req.user) {
      await recordAuditLog({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'USER_LOGOUT',
        resourceType: 'auth',
        resourceId: req.user.id,
      });
    }
    res.json({ success: true, data: { message: 'Signed out successfully.' } });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', requireAuth, async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      user: req.user,
      universityTimezone: env.UNIVERSITY_TIMEZONE,
      universityName: env.UNIVERSITY_NAME,
    },
  });
});
