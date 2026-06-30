import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { authService } from "./sdk";
import { ENV } from "./env";
import { google } from "googleapis";
import { sendWelcomeEmail, sendPasswordResetEmail } from "./email";
import { SignJWT, jwtVerify } from "jose";
import { auditFromReq, recordLoginAttempt, isLockedOut } from "./auditLog";
import { validatePasswordStrength, sanitizeString, logSecurityEvent } from "./security";

/** Timing-safe generic error — prevents email enumeration (OWASP A07) */
const AUTH_ERR = "Invalid email or password";

function getClientIp(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  return (typeof fwd === "string" ? fwd.split(",")[0].trim() : req.ip) ?? "unknown";
}

export function registerAuthRoutes(app: Express) {
  // GET /api/auth/google/callback — Google OAuth callback
  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const code = req.query.code as string | undefined;
    if (!code) {
      res.redirect("/integrations?error=google_no_code");
      return;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:3000/api/auth/google/callback";

    if (!clientId || !clientSecret) {
      res.redirect("/integrations?error=google_not_configured");
      return;
    }

    try {
      // Extract userId from the state parameter (more reliable than cookie during OAuth redirect)
      const stateParam = req.query.state as string | undefined;
      let userId: number | null = null;
      if (stateParam) {
        try {
          const decoded = JSON.parse(Buffer.from(stateParam, "base64").toString("utf-8"));
          userId = decoded.userId ?? null;
        } catch {
          console.error("[Auth] Failed to parse OAuth state param");
        }
      }
      // Fallback to cookie-based auth if state is missing
      if (!userId) {
        const user = await authService.authenticateRequest(req);
        if (!user) {
          res.redirect("/login?error=not_authenticated");
          return;
        }
        userId = user.id;
      }

      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
      const { tokens } = await oauth2Client.getToken(code);

      // Check whether Gmail scope was granted in this auth flow
      const grantedScopes: string = (tokens.scope as string) ?? "";
      const hasGmailScope = grantedScopes.includes("gmail");

      await db.upsertUserIntegrations(userId, {
        googleAccessToken: tokens.access_token ?? null,
        googleRefreshToken: tokens.refresh_token ?? null,
        googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        ...(hasGmailScope ? { gmailEnabled: 1 } : {}),
      } as any);

      res.redirect(hasGmailScope ? "/integrations?connected=google_gmail" : "/integrations?connected=google");
    } catch (error) {
      console.error("[Auth] Google OAuth callback failed:", error);
      res.redirect("/integrations?error=google_auth_failed");
    }
  });

  // GET /api/auth/access/:token — magic link: auto-creates a viewer session
  app.get("/api/auth/access/:token", async (req: Request, res: Response) => {
    const { token } = req.params;
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
      const { payload } = await jwtVerify(token, secret);
      if (payload.type !== "magic_access") {
        res.redirect("/?error=invalid_link");
        return;
      }

      // Find or create the shared viewer account
      const viewerEmail = "viewer@bdbplanner.internal";
      let viewer = await db.getUserByEmail(viewerEmail);
      if (!viewer) {
        const { nanoid } = await import("nanoid");
        await db.upsertUser({
          openId: `viewer-${nanoid(8)}`,
          name: "Viewer",
          email: viewerEmail,
          loginMethod: "email",
          role: "user",
          lastSignedIn: new Date(),
        } as any);
        viewer = await db.getUserByEmail(viewerEmail);
      }
      if (!viewer) {
        res.redirect("/?error=viewer_setup_failed");
        return;
      }

      const sessionToken = await authService.createSessionToken(
        { id: viewer.id, openId: viewer.openId, name: viewer.name },
        { expiresInMs: ONE_YEAR_MS }
      );
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect("/dashboard");
    } catch {
      res.redirect("/?error=invalid_link");
    }
  });

  // POST /api/auth/dev-login — instant login for development only
  app.post("/api/auth/dev-login", async (req: Request, res: Response) => {
    if (process.env.NODE_ENV !== "development") {
      res.status(403).json({ error: "Not available in production" });
      return;
    }
    try {
      const devEmail = "dev@bdbplanner.local";
      let user = await db.getUserByEmail(devEmail);
      if (!user) {
        const passwordHash = await bcrypt.hash("devpassword123", 12); // 12 rounds = ~250ms on modern hardware, good for production
        await db.upsertUser({
          openId: "dev-user-local",
          name: "Leah Marville",
          email: devEmail,
          passwordHash,
          loginMethod: "email",
          role: "admin",
          lastSignedIn: new Date(),
        });
        user = await db.getUserByEmail(devEmail);
      }
      if (!user) {
        res.status(500).json({ error: "Failed to create dev user" });
        return;
      }
      const sessionToken = await authService.createSessionToken(
        { id: user.id, openId: user.openId, name: user.name },
        { expiresInMs: ONE_YEAR_MS }
      );
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
      console.error("[Auth] Dev login failed", error);
      res.status(500).json({ error: "Dev login failed" });
    }
  });

  // POST /api/auth/register
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const { email, password, name, gender } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    // ── Password strength (SOC 2 CC6.1, Essential 8) ────────────────────────
    const strength = validatePasswordStrength(String(password));
    if (!strength.valid) {
      res.status(400).json({ error: strength.errors[0], errors: strength.errors });
      return;
    }

    try {
      const existing = await db.getUserByEmail(String(email).toLowerCase().trim());
      if (existing) {
        res.status(409).json({ error: "An account with this email already exists" });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 12); // 12 rounds = ~250ms on modern hardware, good for production
      const openId = nanoid(21);
      const isAdmin = ENV.adminEmail && email.toLowerCase() === ENV.adminEmail.toLowerCase();

      const validGenders = ["female", "male", "other"];
      await db.upsertUser({
        openId,
        name: name || null,
        email: email.toLowerCase(),
        passwordHash,
        loginMethod: "email",
        role: isAdmin ? "admin" : "user",
        gender: validGenders.includes(gender) ? gender : "other",
        lastSignedIn: new Date(),
      } as any);

      const user = await db.getUserByEmail(email.toLowerCase());
      if (!user) {
        res.status(500).json({ error: "Failed to create user" });
        return;
      }

      const sessionToken = await authService.createSessionToken(
        { id: user.id, openId: user.openId, name: user.name },
        { expiresInMs: ONE_YEAR_MS }
      );

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      auditFromReq(req, "register.success", "auth", "success", user.id, { method: "email" });
      sendWelcomeEmail(user.email!, user.name || "").catch(() => {});
      res.json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
      console.error("[Auth] Registration failed", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // POST /api/auth/forgot-password
  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) { res.status(400).json({ error: "Email is required" }); return; }
    try {
      const user = await db.getUserByEmail(email.toLowerCase());
      // Always return success so we don't leak which emails exist
      if (!user) { res.json({ success: true }); return; }
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
      const token = await new SignJWT({ sub: user.email, type: "password_reset" })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("1h")
        .sign(secret);
      sendPasswordResetEmail(user.email!, token).catch(() => {});
      res.json({ success: true });
    } catch (error) {
      console.error("[Auth] Forgot password failed", error);
      res.status(500).json({ error: "Something went wrong" });
    }
  });

  // POST /api/auth/reset-password
  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    const { token, password } = req.body;
    if (!token || !password) { res.status(400).json({ error: "Token and new password are required" }); return; }
    if (password.length < 8) { res.status(400).json({ error: "Password must be at least 8 characters" }); return; }
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret");
      const { payload } = await jwtVerify(token, secret);
      if (payload.type !== "password_reset" || !payload.sub) {
        res.status(400).json({ error: "Invalid or expired reset link" }); return;
      }
      const user = await db.getUserByEmail(payload.sub as string);
      if (!user) { res.status(404).json({ error: "Account not found" }); return; }
      const passwordHash = await bcrypt.hash(password, 12);
      await db.upsertUser({ openId: user.openId, passwordHash });
      res.json({ success: true });
    } catch {
      res.status(400).json({ error: "Invalid or expired reset link. Please request a new one." });
    }
  });

  // PATCH /api/auth/profile — update name or password
  app.patch("/api/auth/profile", async (req: Request, res: Response) => {
    try {
      const user = await authService.authenticateRequest(req);
      if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }
      const { name, currentPassword, newPassword, newEmail, avatarUrl, bio, timezone, onboardingCompleted } = req.body;
      const dbUser = await db.getUserByOpenId(user.openId);
      if (!dbUser) { res.status(404).json({ error: "User not found" }); return; }
      const updates: Record<string, any> = { openId: user.openId };
      if (name !== undefined) updates.name = name.trim() || null;
      if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
      if (bio !== undefined) updates.bio = bio.trim().slice(0, 280) || null;
      if (timezone !== undefined) updates.timezone = timezone;
      if (onboardingCompleted !== undefined) updates.onboardingCompleted = onboardingCompleted;
      // ── Email change ────────────────────────────────────────────────────────
      if (newEmail) {
        if (!currentPassword) { res.status(400).json({ error: "Current password is required to change email" }); return; }
        if (!dbUser.passwordHash) { res.status(400).json({ error: "No password set on this account" }); return; }
        const validForEmail = await bcrypt.compare(currentPassword, dbUser.passwordHash);
        if (!validForEmail) { res.status(401).json({ error: "Current password is incorrect" }); return; }
        const normalizedEmail = newEmail.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) { res.status(400).json({ error: "Invalid email address" }); return; }
        if (normalizedEmail === dbUser.email?.toLowerCase()) { res.status(400).json({ error: "That is already your current email" }); return; }
        const existing = await db.getUserByEmail(normalizedEmail);
        if (existing) { res.status(409).json({ error: "An account with this email already exists" }); return; }
        updates.email = normalizedEmail;
      }
      // ── Password change ─────────────────────────────────────────────────────
      if (newPassword) {
        if (!currentPassword) { res.status(400).json({ error: "Current password is required" }); return; }
        if (!dbUser.passwordHash) { res.status(400).json({ error: "No password set on this account" }); return; }
        const valid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
        if (!valid) { res.status(401).json({ error: "Current password is incorrect" }); return; }
        if (newPassword.length < 8) { res.status(400).json({ error: "New password must be at least 8 characters" }); return; }
        updates.passwordHash = await bcrypt.hash(newPassword, 12);
      }
      await db.upsertUser(updates as any);
      const updated = await db.getUserByOpenId(user.openId);
      res.json({ success: true, user: { id: updated?.id, name: updated?.name, email: updated?.email, avatarUrl: (updated as any)?.avatarUrl, bio: (updated as any)?.bio, timezone: (updated as any)?.timezone, onboardingCompleted: (updated as any)?.onboardingCompleted } });
    } catch (error) {
      console.error("[Auth] Profile update failed", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // POST /api/auth/login
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const ip = getClientIp(req);

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    // ── Account lockout check (Essential 8, SOC 2 CC6.2) ────────────────────
    if (await isLockedOut(String(email), ip)) {
      auditFromReq(req, "login.blocked", "auth", "blocked", null, { email: String(email).slice(0, 100) });
      res.status(429).json({ error: "Too many failed attempts. Please wait 15 minutes and try again." });
      return;
    }

    try {
      const user = await db.getUserByEmail(String(email).toLowerCase().trim());

      // Always run bcrypt compare even when user not found — prevents timing attacks (OWASP A07)
      const DUMMY_HASH = "$2b$12$LRkCmMeBnJFl.pVf4tE/ieANBxRV7OaEJbL4z5vXf7HrCDHFUQvMi";
      const hashToCheck = user?.passwordHash ?? DUMMY_HASH;
      const valid = await bcrypt.compare(String(password), hashToCheck);

      if (!user || !user.passwordHash || !valid) {
        const { locked, remaining } = await recordLoginAttempt(String(email), ip, false);
        auditFromReq(req, "login.failure", "auth", "failure", user?.id ?? null, {
          email: String(email).slice(0, 100),
          locked,
          remainingAttempts: remaining,
        });
        logSecurityEvent("login.failure", "failure", { email: String(email).slice(0, 100), ip });
        const hint = locked ? " Account temporarily locked — try again in 15 minutes." : "";
        res.status(401).json({ error: AUTH_ERR + hint });
        return;
      }

      await recordLoginAttempt(String(email), ip, true);
      await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });

      const sessionToken = await authService.createSessionToken(
        { id: user.id, openId: user.openId, name: user.name },
        { expiresInMs: ONE_YEAR_MS }
      );

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      auditFromReq(req, "login.success", "auth", "success", user.id, { method: "email" });
      res.json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
      console.error("[Auth] Login failed", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // DELETE /api/auth/account — Right to Erasure (GDPR Art. 17, App Store requirement)
  app.delete("/api/auth/account", async (req: Request, res: Response) => {
    try {
      const user = await authService.authenticateRequest(req);
      if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

      const { password } = req.body;
      const dbUser = await db.getUserByOpenId(user.openId);
      if (!dbUser) { res.status(404).json({ error: "User not found" }); return; }

      // Require password confirmation before erasure
      if (dbUser.passwordHash) {
        if (!password) { res.status(400).json({ error: "Password required to delete account" }); return; }
        const valid = await bcrypt.compare(String(password), dbUser.passwordHash);
        if (!valid) { res.status(401).json({ error: "Incorrect password" }); return; }
      }

      auditFromReq(req, "account.delete", "data", "success", dbUser.id, { email: dbUser.email });
      await db.deleteUserData(dbUser.id);

      // Clear session cookie
      res.clearCookie(COOKIE_NAME);
      res.json({ success: true, message: "Your account and all data have been permanently deleted." });
    } catch (error) {
      console.error("[Auth] Account deletion failed", error);
      res.status(500).json({ error: "Account deletion failed" });
    }
  });

  // GET /api/auth/export — Right to Data Portability (GDPR Art. 20, App Store requirement)
  app.get("/api/auth/export", async (req: Request, res: Response) => {
    try {
      const user = await authService.authenticateRequest(req);
      if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }
      const dbUser = await db.getUserByOpenId(user.openId);
      if (!dbUser) { res.status(404).json({ error: "User not found" }); return; }

      auditFromReq(req, "data.export", "data", "success", dbUser.id);
      const data = await db.exportUserData(dbUser.id);

      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="bdb-data-export-${new Date().toISOString().slice(0,10)}.json"`);
      res.json(data);
    } catch (error) {
      console.error("[Auth] Data export failed", error);
      res.status(500).json({ error: "Data export failed" });
    }
  });
}
