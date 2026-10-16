import { Types } from 'mongoose';
import { AuditLogModel, IAuditLog } from './auditLog.model.js';
import { logger } from '../../utils/logger.js';

export async function recordAuditLog(params: {
  actorId: string;
  actorRole: string;
  action: string;
  resourceType: IAuditLog['resourceType'];
  resourceId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await AuditLogModel.create({
      actorId: new Types.ObjectId(params.actorId),
      actorRole: params.actorRole,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      timestamp: new Date(),
      metadata: params.metadata,
    });
  } catch (error) {
    logger.warn('Failed to persist audit log entry', {
      action: params.action,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
