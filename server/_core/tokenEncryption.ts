import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_ENV = "TOKEN_ENCRYPTION_KEY";

// Prefix added to every encrypted value so we can detect legacy plaintext safely
const ENC_PREFIX = "enc:";

function getKey(): Buffer {
  const raw = process.env[KEY_ENV];
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`${KEY_ENV} must be set in production to protect OAuth tokens`);
    }
    // Dev fallback — deterministic, clearly insecure, never used in prod
    return Buffer.alloc(32, 0x42);
  }
  const buf = Buffer.from(raw, "hex");
  if (buf.length !== 32) {
    throw new Error(`${KEY_ENV} must be exactly 64 hex characters (32 bytes). Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`);
  }
  return buf;
}

/**
 * Encrypt a token string using AES-256-GCM.
 * Returns "enc:<iv>:<authTag>:<ciphertext>" (all hex).
 */
export function encryptToken(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12); // 96-bit IV — optimal for GCM
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENC_PREFIX}${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypt a token encrypted with encryptToken.
 * Handles legacy plaintext values gracefully (returns them as-is).
 */
export function decryptToken(value: string): string {
  if (!value.startsWith(ENC_PREFIX)) {
    // Legacy plaintext — return as-is; will be re-encrypted on next write
    return value;
  }
  const key = getKey();
  const inner = value.slice(ENC_PREFIX.length);
  const parts = inner.split(":");
  if (parts.length !== 3) return value; // malformed — fail safe
  const [ivHex, tagHex, dataHex] = parts;
  try {
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const data = Buffer.from(dataHex, "hex");
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    // Auth tag mismatch — token was tampered with or key is wrong
    throw new Error("Token decryption failed: invalid key or tampered data");
  }
}

/** Fields in user_integrations that contain sensitive tokens and must be encrypted */
const SENSITIVE_FIELDS = [
  "googleAccessToken",
  "googleRefreshToken",
  "gmailAccessToken",
  "gmailRefreshToken",
  "slackBotToken",
  "boxAccessToken",
  "notionToken",
] as const;

type SensitiveField = typeof SENSITIVE_FIELDS[number];

/** Encrypt all sensitive fields in an integrations object before writing to DB */
export function encryptIntegrationTokens<T extends Record<string, unknown>>(data: T): T {
  const result: Record<string, unknown> = { ...data };
  for (const field of SENSITIVE_FIELDS) {
    if (field in result && typeof result[field] === "string" && result[field]) {
      result[field] = encryptToken(result[field] as string);
    }
  }
  return result as T;
}

/** Decrypt all sensitive fields in an integrations object after reading from DB */
export function decryptIntegrationTokens<T extends Record<string, unknown>>(data: T): T {
  const result: Record<string, unknown> = { ...data };
  for (const field of SENSITIVE_FIELDS) {
    if (field in result && typeof result[field] === "string" && result[field]) {
      try {
        result[field] = decryptToken(result[field] as string);
      } catch {
        // If decryption fails, null out the field rather than exposing garbled data
        result[field] = null;
      }
    }
  }
  return result as T;
}

// ── HMAC-signed OAuth state ───────────────────────────────────────────────────

function getHmacKey(): string {
  return process.env.JWT_SECRET ?? "fallback-secret-change-in-prod";
}

/**
 * Create a tamper-proof OAuth state parameter.
 * Format: base64(JSON) + "." + HMAC-SHA256 signature (hex)
 */
export function signOAuthState(payload: Record<string, unknown>): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", getHmacKey()).update(data).digest("hex");
  return `${data}.${sig}`;
}

/**
 * Verify and decode an OAuth state parameter.
 * Throws if the signature is invalid (CSRF attempt).
 */
export function verifyOAuthState(state: string): Record<string, unknown> {
  const dot = state.lastIndexOf(".");
  if (dot === -1) throw new Error("Invalid OAuth state: missing signature");
  const data = state.slice(0, dot);
  const sig = state.slice(dot + 1);
  const expected = createHmac("sha256", getHmacKey()).update(data).digest("hex");
  // Timing-safe comparison prevents signature oracle attacks
  if (!timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) {
    throw new Error("Invalid OAuth state: signature mismatch");
  }
  return JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
}
