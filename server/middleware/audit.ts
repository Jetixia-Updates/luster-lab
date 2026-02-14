/**
 * Audit Logging Middleware
 * Records all significant actions for compliance and traceability
 */

import { auditLogs, generateId } from "../data/store";
import type { AuditLog } from "@shared/api";

export function logAudit(
  userId: string,
  userName: string,
  action: string,
  entity: string,
  entityId: string,
  details?: string
): AuditLog {
  const log: AuditLog = {
    id: generateId("log"),
    userId,
    userName,
    action,
    entity,
    entityId,
    details,
    timestamp: new Date().toISOString(),
  };
  auditLogs.unshift(log);
  // Keep only last 1000 logs in memory
  if (auditLogs.length > 1000) auditLogs.pop();
  return log;
}
