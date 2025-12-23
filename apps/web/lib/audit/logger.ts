import { prisma } from '@horizon/db';

/**
 * SECURITY: Audit Logging System
 *
 * Logs all security-relevant events for compliance, debugging, and security monitoring.
 *
 * Events tracked:
 * - Authentication (login, logout, failed attempts)
 * - Account changes (password reset, email change, role change)
 * - Access control (permission denied, tenant access attempts)
 * - Data access (sensitive operations)
 */

export enum AuditEventType {
  // Authentication events
  AUTH_LOGIN_SUCCESS = 'AUTH_LOGIN_SUCCESS',
  AUTH_LOGIN_FAILURE = 'AUTH_LOGIN_FAILURE',
  AUTH_LOGOUT = 'AUTH_LOGOUT',
  AUTH_SESSION_EXPIRED = 'AUTH_SESSION_EXPIRED',

  // Account events
  ACCOUNT_CREATED = 'ACCOUNT_CREATED',
  ACCOUNT_DELETED = 'ACCOUNT_DELETED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED = 'PASSWORD_RESET_COMPLETED',
  EMAIL_CHANGED = 'EMAIL_CHANGED',
  EMAIL_VERIFIED = 'EMAIL_VERIFIED',

  // Access control events
  ACCESS_DENIED = 'ACCESS_DENIED',
  ROLE_CHANGED = 'ROLE_CHANGED',
  TENANT_ACCESS_GRANTED = 'TENANT_ACCESS_GRANTED',
  TENANT_ACCESS_DENIED = 'TENANT_ACCESS_DENIED',

  // Security events
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',

  // Data access events
  SENSITIVE_DATA_ACCESSED = 'SENSITIVE_DATA_ACCESSED',
  BULK_EXPORT = 'BULK_EXPORT',
}

export enum AuditEventSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

interface AuditLogData {
  eventType: AuditEventType;
  severity: AuditEventSeverity;
  userId?: string | null;
  tenantId?: string | null;
  ipAddress?: string;
  userAgent?: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, any>;
  errorMessage?: string;
}

/**
 * Create an audit log entry
 *
 * This function should never throw - audit logging failures should not break application flow
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    // TODO: Implement actual audit log storage
    // For now, log to console in structured format

    const logEntry = {
      timestamp: new Date().toISOString(),
      ...data,
    };

    // In production, write to:
    // 1. Database audit_logs table
    // 2. External logging service (e.g., CloudWatch, Datadog)
    // 3. SIEM system for security monitoring

    console.log('[AUDIT]', JSON.stringify(logEntry));

    // Example database implementation:
    // await prisma.audit_logs.create({
    //   data: {
    //     id: crypto.randomUUID(),
    //     eventType: data.eventType,
    //     severity: data.severity,
    //     userId: data.userId,
    //     tenantId: data.tenantId,
    //     ipAddress: data.ipAddress,
    //     userAgent: data.userAgent,
    //     resourceType: data.resourceType,
    //     resourceId: data.resourceId,
    //     details: data.details,
    //     errorMessage: data.errorMessage,
    //     createdAt: new Date(),
    //   },
    // });
  } catch (error) {
    // Never let audit logging break the application
    console.error('[AUDIT ERROR]', error);
  }
}

/**
 * Helper functions for common audit events
 */
export const auditLog = {
  /**
   * Log successful login
   */
  loginSuccess: async (
    userId: string,
    tenantId: string,
    ipAddress?: string,
    userAgent?: string
  ) => {
    await createAuditLog({
      eventType: AuditEventType.AUTH_LOGIN_SUCCESS,
      severity: AuditEventSeverity.INFO,
      userId,
      tenantId,
      ipAddress,
      userAgent,
    });
  },

  /**
   * Log failed login attempt
   */
  loginFailure: async (email: string, reason: string, ipAddress?: string, userAgent?: string) => {
    await createAuditLog({
      eventType: AuditEventType.AUTH_LOGIN_FAILURE,
      severity: AuditEventSeverity.WARNING,
      ipAddress,
      userAgent,
      details: { email, reason },
    });
  },

  /**
   * Log logout
   */
  logout: async (userId: string, tenantId: string, ipAddress?: string) => {
    await createAuditLog({
      eventType: AuditEventType.AUTH_LOGOUT,
      severity: AuditEventSeverity.INFO,
      userId,
      tenantId,
      ipAddress,
    });
  },

  /**
   * Log access denied
   */
  accessDenied: async (
    userId: string | null,
    resource: string,
    reason: string,
    ipAddress?: string
  ) => {
    await createAuditLog({
      eventType: AuditEventType.ACCESS_DENIED,
      severity: AuditEventSeverity.WARNING,
      userId,
      resourceType: resource,
      ipAddress,
      details: { reason },
    });
  },

  /**
   * Log tenant access attempt
   */
  tenantAccessAttempt: async (
    userId: string,
    tenantId: string,
    granted: boolean,
    reason?: string
  ) => {
    await createAuditLog({
      eventType: granted
        ? AuditEventType.TENANT_ACCESS_GRANTED
        : AuditEventType.TENANT_ACCESS_DENIED,
      severity: granted ? AuditEventSeverity.INFO : AuditEventSeverity.WARNING,
      userId,
      tenantId,
      details: { reason },
    });
  },

  /**
   * Log rate limit exceeded
   */
  rateLimitExceeded: async (endpoint: string, ipAddress: string) => {
    await createAuditLog({
      eventType: AuditEventType.RATE_LIMIT_EXCEEDED,
      severity: AuditEventSeverity.WARNING,
      ipAddress,
      resourceType: endpoint,
    });
  },

  /**
   * Log account locked
   */
  accountLocked: async (userId: string, reason: string) => {
    await createAuditLog({
      eventType: AuditEventType.ACCOUNT_LOCKED,
      severity: AuditEventSeverity.WARNING,
      userId,
      details: { reason },
    });
  },

  /**
   * Log password change
   */
  passwordChanged: async (userId: string, tenantId: string, ipAddress?: string) => {
    await createAuditLog({
      eventType: AuditEventType.PASSWORD_CHANGED,
      severity: AuditEventSeverity.INFO,
      userId,
      tenantId,
      ipAddress,
    });
  },

  /**
   * Log role change
   */
  roleChanged: async (
    userId: string,
    tenantId: string,
    oldRole: string,
    newRole: string,
    changedBy: string
  ) => {
    await createAuditLog({
      eventType: AuditEventType.ROLE_CHANGED,
      severity: AuditEventSeverity.WARNING,
      userId,
      tenantId,
      details: { oldRole, newRole, changedBy },
    });
  },

  /**
   * Log suspicious activity
   */
  suspiciousActivity: async (
    userId: string | null,
    description: string,
    ipAddress?: string,
    details?: Record<string, any>
  ) => {
    await createAuditLog({
      eventType: AuditEventType.SUSPICIOUS_ACTIVITY,
      severity: AuditEventSeverity.CRITICAL,
      userId,
      ipAddress,
      details: { description, ...details },
    });
  },
};
