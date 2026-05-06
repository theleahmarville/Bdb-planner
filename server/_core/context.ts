import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { authService } from "./sdk";
import { COOKIE_NAME } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import { decodeJwt } from "jose";

// Warn when a session token is within this many seconds of expiring
const EXPIRY_WARN_THRESHOLD_SECONDS = 7 * 24 * 60 * 60; // 7 days

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

function checkTokenExpiry(cookieHeader: string | undefined): void {
  if (!cookieHeader) return;
  try {
    const parsed = parseCookieHeader(cookieHeader);
    const token = parsed[COOKIE_NAME];
    if (!token) return;

    const payload = decodeJwt(token);
    const exp = payload.exp;
    if (typeof exp !== "number") return;

    const nowSeconds = Math.floor(Date.now() / 1000);
    const secondsUntilExpiry = exp - nowSeconds;

    if (secondsUntilExpiry < 0) {
      console.warn("[Auth] Session token is already expired.");
    } else if (secondsUntilExpiry < EXPIRY_WARN_THRESHOLD_SECONDS) {
      const daysLeft = Math.floor(secondsUntilExpiry / 86400);
      console.warn(`[Auth] Session token expires in ${daysLeft} day(s) — user should re-authenticate soon.`);
    }
  } catch {
    // Decoding failures are non-fatal; verification happens in authenticateRequest
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // Check if the token is close to expiring and log a warning
  checkTokenExpiry(opts.req.headers.cookie);

  try {
    user = await authService.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    console.error("Failed to authenticate request context:", error);
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
