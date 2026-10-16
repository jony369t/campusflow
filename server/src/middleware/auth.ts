import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { UserModel, UserRole } from '../modules/users/user.model.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  departmentId?: string;
  classMemberships: string[];
  assignedCourseIds: string[];
  canPublishDirectly: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const SESSION_COOKIE_NAME = 'campusflow_session';
export const CSRF_COOKIE_NAME = 'campusflow_csrf';

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const cookieToken = req.cookies?.[SESSION_COOKIE_NAME];
    const headerAuth = req.headers.authorization;
    const bearerToken =
      headerAuth && headerAuth.startsWith('Bearer ') ? headerAuth.slice(7).trim() : undefined;
    const token = cookieToken || bearerToken;

    if (!token) {
      throw AppError.unauthorized('Please sign in to access CampusFlow AI.');
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as { sub: string; csrf?: string };

    // Enforce double-submit CSRF token on state-changing requests when using cookie auth
    if (
      env.CSRF_PROTECTION_ENABLED &&
      cookieToken &&
      ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)
    ) {
      const csrfHeader = req.headers['x-csrf-token'];
      if (!csrfHeader || csrfHeader !== decoded.csrf) {
        throw AppError.forbidden('Invalid or missing CSRF security token.');
      }
    }

    const userDoc = await UserModel.findById(decoded.sub).lean();
    if (!userDoc || !userDoc.isActive) {
      throw AppError.unauthorized('Account is inactive or no longer exists.');
    }

    req.user = {
      id: String(userDoc._id),
      email: userDoc.email,
      name: userDoc.name,
      role: userDoc.role,
      departmentId: userDoc.departmentId ? String(userDoc.departmentId) : undefined,
      classMemberships: (userDoc.classMemberships || []).map(String),
      assignedCourseIds: (userDoc.assignedCourseIds || []).map(String),
      canPublishDirectly: Boolean(userDoc.canPublishDirectly),
    };
    next();
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
      return;
    }
    next(AppError.unauthorized('Invalid or expired session. Please sign in again.'));
  }
}

export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      next(
        AppError.forbidden(
          `Access denied. Required role: ${allowedRoles.join(' or ')}. Current role: ${req.user.role}.`
        )
      );
      return;
    }
    next();
  };
}

/**
 * Object-level authorization helper: verifies if the authenticated user can view or manage
 * resources scoped to specific classes or courses.
 */
export function isAuthorizedForScope(
  user: AuthenticatedUser,
  targetClassIds: string[],
  targetCourseIds: string[] = [],
  mode: 'read' | 'write' = 'read'
): boolean {
  if (user.role === 'cr') return true;

  // Global campus notice/event (empty targetClassIds and empty targetCourseIds) is readable by all
  if (mode === 'read' && targetClassIds.length === 0 && targetCourseIds.length === 0) {
    return true;
  }

  const hasClassAccess =
    targetClassIds.length > 0 &&
    targetClassIds.some((cid) => user.classMemberships.includes(String(cid)));

  const hasCourseAccess =
    targetCourseIds.length > 0 &&
    targetCourseIds.some((courseId) => user.assignedCourseIds.includes(String(courseId)));

  if (mode === 'read') {
    return hasClassAccess || hasCourseAccess;
  }

  // Write mode: students can never write
  if (user.role === 'student') return false;
  if (user.role === 'cr') {
    return (
      targetClassIds.length > 0 &&
      targetClassIds.every((cid) => user.classMemberships.includes(String(cid)))
    );
  }
  if (user.role === 'teacher') {
    return (
      (targetCourseIds.length > 0 &&
        targetCourseIds.every((id) => user.assignedCourseIds.includes(String(id)))) ||
      hasClassAccess
    );
  }
  return false;
}
