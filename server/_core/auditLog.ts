/**
 * Audit Logging — ISO 27001 A.12.4, SOC 2 CC7.1/CC7.2
 *
 * All security-relevant events are recorded in `audit_log`:
 * auth events, admin actions, data access, security violations.
 * Logs are write-only from the application (never deleted via API).
 */

import type { Request } from "express";

export type AuditCategory = "auth" | "data" | "admin" | "security";
export type AuditOutcome  = "success" | "failure" | "blocked";

export interface AuditEvent {
  userId?:   number | null;
  event:     string;
  category:  AuditCategory;
  outcome:   AuditOutcome;
  ip?:       string;
  userAgent?: string;
  detail?:   Record<string, unknown>;
  requestId?: string;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.ip ?? req.socket?.remoteAddress ?? "unknown";
}

/** Write an audit event — never throws, never blocks the request */
export async function writeAuditLog(event: AuditEvent): Promise<void> {
  try {
    const { getPool } = await import("../db");
    const pool = getPool();
    if (!pool) return;
    const conn = await pool.getConnection();
    try {
      await conn.query(
        `INSERT INTO \`audit_log\` (userId, event, category, outcome, ip, userAgent, detail, requestId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          event.userId ?? null,
          event.event.slice(0, 100),
          event.category,
          event.outcome,
          (event.ip ?? "unknown").slice(0, 64),
          (event.userAgent ?? "").slice(0, 500),
          event.detail ? JSON.stringify(event.detail) : null,
          event.requestId ?? null,
        ]
      );
    } finally {
      conn.release();
    }
  } catch {
    // Audit log must never crash the app — log to stderr as fallback
    console.error("[AuditLog] Failed to write:", event.event, event.outcome);
  }
}

/** Convenience: log from an Express request */
export function auditFromReq(
  req: Request,
  event: string,
  category: AuditCategory,
  outcome: AuditOutcome,
  userId?: number | null,
  detail?: Record<string, unknown>
): void {
  writeAuditLog({
    userId,
    event,
    category,
    outcome,
    ip: getClientIp(req),
    userAgent: req.headers["user-agent"],
    detail,
    requestId: (req as any).__requestId,
  }).catch(() => {});
}

/** Track a failed login attempt and return whether the account should be locked */
export async function recordLoginAttempt(
  email: string,
  ip: string,
  success: boolean
): Promise<{ locked: boolean; remaining: number }> {
  try {
    const { getPool } = await import("../db");
    const pool = getPool();
    if (!pool) return { locked: false, remaining: 5 };
    const conn = await pool.getConnection();
    try {
      await conn.query(
        `INSERT INTO \`login_attempts\` (email, ip, success) VALUES (?, ?, ?)`,
        [email.toLowerCase().slice(0, 255), ip.slice(0, 64), success ? 1 : 0]
      );

      if (success) return { locked: false, remaining: 5 };

      // Count failures in the last 15 minutes (Essential 8 / SOC 2 CC6.2)
      const [rows] = await conn.query(
        `SELECT COUNT(*) as cnt FROM \`login_attempts\`
         WHERE email = ? AND success = 0 AND createdAt >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)`,
        [email.toLowerCase()]
      );
      const failCount = (rows as any[])[0]?.cnt ?? 0;
      const MAX_ATTEMPTS = 5;
      const remaining = Math.max(0, MAX_ATTEMPTS - failCount);
      return { locked: failCount >= MAX_ATTEMPTS, remaining };
    } finally {
      conn.release();
    }
  } catch {
    return { locked: false, remaining: 5 };
  }
}

/** Check if an email/IP is currently locked out */
export async function isLockedOut(email: string, ip: string): Promise<boolean> {
  try {
    const { getPool } = await import("../db");
    const pool = getPool();
    if (!pool) return false;
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.query(
        `SELECT COUNT(*) as cnt FROM \`login_attempts\`
         WHERE (email = ? OR ip = ?) AND success = 0
         AND createdAt >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)`,
        [email.toLowerCase(), ip.slice(0, 64)]
      );
      return ((rows as any[])[0]?.cnt ?? 0) >= 5;
    } finally {
      conn.release();
    }
  } catch {
    return false;
  }
}
