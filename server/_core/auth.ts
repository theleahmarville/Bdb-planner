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

      await db.upsertUserIntegrations(userId, {
        googleAccessToken: tokens.access_token ?? null,
        googleRefreshToken: tokens.refresh_token ?? null,
        googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      } as any);

      res.redirect("/integrations?connected=google");
    } catch (error) {
      console.error("[Auth] Google OAuth callback failed:", error);
      res.redirect("/integrations?error=google_auth_failed");
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

    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    try {
      const existing = await db.getUserByEmail(email);
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

      // Send welcome email (non-blocking — never delays registration response)
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
      const { name, currentPassword, newPassword, avatarUrl, bio, timezone, onboardingCompleted } = req.body;
      const dbUser = await db.getUserByOpenId(user.openId);
      if (!dbUser) { res.status(404).json({ error: "User not found" }); return; }
      const updates: Record<string, any> = { openId: user.openId };
      if (name !== undefined) updates.name = name.trim() || null;
      if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
      if (bio !== undefined) updates.bio = bio.trim().slice(0, 280) || null;
      if (timezone !== undefined) updates.timezone = timezone;
      if (onboardingCompleted !== undefined) updates.onboardingCompleted = onboardingCompleted;
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

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    try {
      const user = await db.getUserByEmail(email.toLowerCase());
      if (!user || !user.passwordHash) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      await db.upsertUser({
        openId: user.openId,
        lastSignedIn: new Date(),
      });

      const sessionToken = await authService.createSessionToken(
        { id: user.id, openId: user.openId, name: user.name },
        { expiresInMs: ONE_YEAR_MS }
      );

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
      console.error("[Auth] Login failed", error);
      res.status(500).json({ error: "Login failed" });
    }
  });
}
