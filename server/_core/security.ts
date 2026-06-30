/**
 * Security Middleware — Production Hardening
 *
 * Implements:
 * - ISO 27001:  A.12.4 (logging), A.14.2 (secure dev), A.18.1 (compliance)
 * - SOC 2:      CC6.1 (logical access), CC6.7 (transmission security), CC7.1 (monitoring)
 * - Essential 8: Application hardening, restrict admin privileges
 * - OWASP Top 10: A02 (crypto), A03 (injection), A05 (misconfiguration), A09 (logging)
 */

import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

// ── 1. Request ID — enables full audit trail correlation ──────────────────────
export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction) {
  (req as any).__requestId = randomUUID();
  next();
}

// ── 2. Content Security Policy ────────────────────────────────────────────────
// Re-enables CSP properly for production (was set to false in helmet config)
// OWASP A05, SOC 2 CC6.7
export function cspMiddleware(_req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV !== "production") return next();

  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",           // inline scripts needed for Vite prod bundle
      "style-src 'self' 'unsafe-inline'",            // inline styles from Radix/Tailwind
      "img-src 'self' data: blob: https:",           // allow external images (avatars, vision board)
      "font-src 'self' data:",
      "connect-src 'self' https://api.anthropic.com https://www.googleapis.com https://accounts.google.com",
      "frame-ancestors 'none'",                       // clickjacking protection (replaces X-Frame-Options)
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; ")
  );
  next();
}

// ── 3. Enhanced Security Headers ──────────────────────────────────────────────
// Permissions-Policy, CORP, COOP — ISO 27001 A.14.2
export function securityHeadersMiddleware(_req: Request, res: Response, next: NextFunction) {
  // Disable browser features not needed by the app
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(self), geolocation=(), payment=(), usb=(), bluetooth=()"
  );
  // Prevent cross-origin isolation issues while protecting against Spectre
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups"); // allow OAuth popups
  // Cache-control for API responses — prevent sensitive data caching
  next();
}

// ── 4. API Cache-Control — prevent sensitive data in browser/CDN cache ────────
export function noCacheApiMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.path.startsWith("/api/")) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
  }
  next();
}

// ── 5. HTTPS enforcement ──────────────────────────────────────────────────────
// Redirect HTTP → HTTPS in production (SOC 2 CC6.7)
export function httpsEnforcement(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV !== "production") return next();

  const proto = req.headers["x-forwarded-proto"];
  const isHttps = proto === "https" || (Array.isArray(proto) && proto[0] === "https");

  if (!isHttps && req.method !== "OPTIONS") {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
}

// ── 6. Content-Type enforcement — prevent MIME sniffing attacks ───────────────
// OWASP A05
export function contentTypeMiddleware(req: Request, res: Response, next: NextFunction) {
  if (
    ["POST", "PUT", "PATCH"].includes(req.method) &&
    req.path.startsWith("/api/") &&
    !req.path.startsWith("/api/upload") // multipart excluded
  ) {
    const ct = req.headers["content-type"] ?? "";
    if (ct && !ct.includes("application/json") && !ct.includes("text/plain")) {
      return res.status(415).json({ error: "Unsupported Media Type" });
    }
  }
  next();
}

// ── 7. Input size guard — prevent resource exhaustion attacks ─────────────────
// Beyond express body limit — catches malformed oversized strings in specific fields
export function inputSanitizer(obj: unknown, maxDepth = 5, depth = 0): unknown {
  if (depth > maxDepth) return null;
  if (typeof obj === "string") return obj.slice(0, 50_000); // hard cap per string field
  if (Array.isArray(obj)) return obj.slice(0, 1000).map(v => inputSanitizer(v, maxDepth, depth + 1));
  if (obj && typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out[k.slice(0, 200)] = inputSanitizer(v, maxDepth, depth + 1);
    }
    return out;
  }
  return obj;
}

// ── 8. Security event logger (structured, goes to stdout for Railway logs) ────
// ISO 27001 A.12.4.1 — machine-readable for SIEM ingestion
export function logSecurityEvent(
  event: string,
  outcome: "success" | "failure" | "blocked",
  detail: Record<string, unknown> = {}
) {
  const entry = {
    ts: new Date().toISOString(),
    level: outcome === "success" ? "INFO" : "WARN",
    type: "SECURITY",
    event,
    outcome,
    ...detail,
  };
  if (outcome === "success") {
    console.log(JSON.stringify(entry));
  } else {
    console.warn(JSON.stringify(entry));
  }
}

// ── 9. Password strength validator ───────────────────────────────────────────
// SOC 2 CC6.1, Essential 8
export interface PasswordStrengthResult {
  valid: boolean;
  errors: string[];
}

export function validatePasswordStrength(password: string): PasswordStrengthResult {
  const errors: string[] = [];
  if (password.length < 12)                               errors.push("At least 12 characters required");
  if (!/[A-Z]/.test(password))                           errors.push("At least one uppercase letter required");
  if (!/[a-z]/.test(password))                           errors.push("At least one lowercase letter required");
  if (!/[0-9]/.test(password))                           errors.push("At least one number required");
  if (!/[^A-Za-z0-9]/.test(password))                   errors.push("At least one special character required");

  // Common password check (top patterns)
  const common = ["password", "12345678", "qwerty", "letmein", "welcome", "admin", "bedobecome", "planner"];
  if (common.some(p => password.toLowerCase().includes(p))) {
    errors.push("Password is too common or predictable");
  }

  return { valid: errors.length === 0, errors };
}

// ── 10. Sanitize user-supplied strings before DB storage ─────────────────────
// Strips null bytes and control characters that can break logging/display
// OWASP A03
export function sanitizeString(input: unknown, maxLen = 5000): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/\0/g, "")                    // null bytes
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")  // non-printable control chars
    .slice(0, maxLen)
    .trim();
}
