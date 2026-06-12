import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = process.env.EMAIL_FROM || "Be Do Become <hello@bedobecome.com>";
const APP_URL = process.env.APP_URL || "https://bdbplanner.com";

// ── Shared helpers ─────────────────────────────────────────────────────────────

/** Convert simple markdown to email-safe HTML (headings, bold, bullets, line breaks) */
function mdToHtml(md: string): string {
  return md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^## (.+)$/gm, '<h3 style="margin:18px 0 6px;font-size:15px;font-weight:800;color:#1a1a1a;">$1</h3>')
    .replace(/^### (.+)$/gm, '<h4 style="margin:14px 0 4px;font-size:13px;font-weight:700;color:#2d2d2d;">$1</h4>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<li style="margin:3px 0;font-size:14px;color:#4a4a4a;line-height:1.6;">$1</li>')
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, m => `<ul style="margin:6px 0 10px 18px;padding:0;">${m}</ul>`)
    .replace(/\n\n/g, '</p><p style="margin:8px 0;font-size:14px;line-height:1.7;color:#4a4a4a;">')
    .replace(/\n/g, "<br/>")
    .replace(/^/, '<p style="margin:8px 0;font-size:14px;line-height:1.7;color:#4a4a4a;">')
    .replace(/$/, "</p>");
}

function emailShell(accentColor: string, headerEmoji: string, headerTitle: string, headerSub: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#faf8f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf8f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:${accentColor};padding:36px 40px 28px;text-align:center;">
            <p style="margin:0 0 4px;font-size:13px;color:rgba(255,255,255,0.8);letter-spacing:2px;text-transform:uppercase;font-weight:600;">Be · Do · Become</p>
            <div style="font-size:36px;margin:8px 0 4px;">${headerEmoji}</div>
            <h1 style="margin:0;font-size:26px;font-weight:900;color:#ffffff;">${headerTitle}</h1>
            <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">${headerSub}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            ${body}
            <table cellpadding="0" cellspacing="0" width="100%" style="margin-top:28px;">
              <tr><td align="center">
                <a href="${APP_URL}/dashboard" style="display:inline-block;background:${accentColor};color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:10px;">
                  Open My Planner →
                </a>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #f0ebe4;text-align:center;">
            <p style="margin:0;font-size:11px;color:#b0a090;line-height:1.6;">
              BDB Digital Wellness Planner by <strong>Leah Marville</strong> · Be Do Become Wellness<br/>
              Zion is your AI wellness assistant — powered by Claude.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendWelcomeEmail(to: string, name: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY not set — skipping welcome email");
    return;
  }

  const firstName = name?.split(" ")[0] || "there";

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: "Welcome to BDB Digital Wellness Planner 🌟",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to BDB Digital Wellness Planner</title>
</head>
<body style="margin:0;padding:0;background-color:#faf8f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf8f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#10b981,#059669);padding:40px 40px 32px;text-align:center;">
              <p style="margin:0 0 8px;font-size:13px;color:rgba(255,255,255,0.8);letter-spacing:2px;text-transform:uppercase;font-weight:600;">Be · Do · Become</p>
              <h1 style="margin:0;font-size:32px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">BDB Digital Wellness Planner</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;font-size:24px;font-weight:800;color:#1a1a1a;">Welcome, ${firstName}! 🌟</h2>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#4a4a4a;">
                You've just taken a powerful step toward your best year. The BDB Digital Wellness Planner is your personal command centre for turning your vision into reality.
              </p>

              <div style="background:#faf8f5;border-radius:12px;padding:24px;margin:0 0 28px;">
                <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#8a7a6a;text-transform:uppercase;letter-spacing:1px;">What's waiting for you</p>
                <table cellpadding="0" cellspacing="0" width="100%">
                  ${[
                    ["✨", "Annual Planning", "Vision board, big goals & your personal contract"],
                    ["📅", "Monthly & Weekly Views", "Structured planning for every day of the year"],
                    ["🤖", "Zion AI Assistant", "Your personal AI wellness coach, powered by Claude"],
                    ["🔔", "Smart Reminders", "Slack & browser notifications so nothing slips"],
                    ["📝", "Notes", "Capture ideas, plans & insights in one place"],
                  ].map(([icon, title, desc]) => `
                  <tr>
                    <td style="padding:8px 0;vertical-align:top;width:32px;font-size:20px;">${icon}</td>
                    <td style="padding:8px 0 8px 8px;">
                      <p style="margin:0;font-size:14px;font-weight:700;color:#1a1a1a;">${title}</p>
                      <p style="margin:2px 0 0;font-size:13px;color:#8a7a6a;">${desc}</p>
                    </td>
                  </tr>`).join("")}
                </table>
              </div>

              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${APP_URL}" style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:12px;letter-spacing:0.3px;">
                      Start Planning →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #f0ebe4;text-align:center;">
              <p style="margin:0;font-size:12px;color:#b0a090;line-height:1.6;">
                BDB Digital Wellness Planner by <strong>Leah Marville</strong> · Be Do Become Wellness<br />
                You're receiving this because you just created an account.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    console.log(`[Email] Welcome email sent to ${to}`);
  } catch (err) {
    // Never crash registration because email failed
    console.error("[Email] Failed to send welcome email:", err);
  }
}

export async function sendPasswordResetEmail(to: string, resetToken: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY not set — skipping password reset email");
    return;
  }
  const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: "Reset your BDB Digital Wellness Planner password",
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#faf8f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf8f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#10b981,#059669);padding:36px 40px;text-align:center;">
            <p style="margin:0 0 6px;font-size:12px;color:rgba(255,255,255,0.8);letter-spacing:2px;text-transform:uppercase;font-weight:600;">Be · Do · Become</p>
            <h1 style="margin:0;font-size:26px;font-weight:900;color:#ffffff;">Password Reset</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="margin:0 0 12px;font-size:20px;font-weight:800;color:#1a1a1a;">Forgot your password?</h2>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#4a4a4a;">
              No worries — it happens to the best of us. Click the button below to set a new password. This link expires in <strong>1 hour</strong>.
            </p>
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr><td align="center">
                <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:12px;">
                  Reset My Password →
                </a>
              </td></tr>
            </table>
            <p style="margin:28px 0 0;font-size:13px;color:#8a7a6a;text-align:center;">
              If you didn't request this, you can safely ignore this email.<br/>Your password won't change.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #f0ebe4;text-align:center;">
            <p style="margin:0;font-size:12px;color:#b0a090;">BDB Digital Wellness Planner by <strong>Leah Marville</strong> · Be Do Become Wellness</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
    console.log(`[Email] Password reset email sent to ${to}`);
  } catch (err) {
    console.error("[Email] Failed to send password reset email:", err);
  }
}

// ── Morning Chief of Staff Briefing ───────────────────────────────────────────

export async function sendMorningBriefingEmail(to: string, name: string, briefing: string, dateLabel: string) {
  if (!process.env.RESEND_API_KEY) return;
  const firstName = name?.split(" ")[0] || "there";
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: `☀️ Good morning, ${firstName} — Your Zion Briefing for ${dateLabel}`,
      html: emailShell(
        "linear-gradient(135deg,#7c3aed,#4f46e5)",
        "☀️",
        "Good Morning Briefing",
        `${dateLabel} · Powered by Zion`,
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#4a4a4a;">
          Good morning, <strong>${firstName}</strong>! Here's your daily briefing from Zion — your AI Chief of Staff.
        </p>
        <div style="background:#faf8f5;border-radius:12px;padding:24px;border-left:4px solid #7c3aed;">
          ${mdToHtml(briefing)}
        </div>`
      ),
    });
    console.log(`[Email] Morning briefing sent to ${to}`);
  } catch (err) {
    console.error("[Email] Failed to send morning briefing:", err);
  }
}

// ── Sunday Week-Ahead Review ──────────────────────────────────────────────────

export async function sendWeekAheadEmail(to: string, name: string, content: string, weekLabel: string) {
  if (!process.env.RESEND_API_KEY) return;
  const firstName = name?.split(" ")[0] || "there";
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: `🗓️ ${firstName}, your week ahead is ready — ${weekLabel}`,
      html: emailShell(
        "linear-gradient(135deg,#059669,#10b981)",
        "🗓️",
        "Your Week Ahead",
        `${weekLabel} · Sunday Review by Zion`,
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#4a4a4a;">
          Zion has reviewed your goals and planner to prepare your week. Here's what you need to know going into <strong>${weekLabel}</strong>.
        </p>
        <div style="background:#f0fdf4;border-radius:12px;padding:24px;border-left:4px solid #10b981;">
          ${mdToHtml(content)}
        </div>`
      ),
    });
    console.log(`[Email] Week-ahead review sent to ${to}`);
  } catch (err) {
    console.error("[Email] Failed to send week-ahead review:", err);
  }
}

// ── Monthly Reflection ────────────────────────────────────────────────────────

export async function sendMonthlyReflectionEmail(to: string, name: string, content: string, monthLabel: string) {
  if (!process.env.RESEND_API_KEY) return;
  const firstName = name?.split(" ")[0] || "there";
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: `🌙 ${firstName}, your ${monthLabel} reflection is here`,
      html: emailShell(
        "linear-gradient(135deg,#1a1230,#2d1f4e)",
        "🌙",
        `${monthLabel} Reflection`,
        "Monthly review · Powered by Zion",
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#4a4a4a;">
          ${monthLabel} is wrapping up, <strong>${firstName}</strong>. Zion has reviewed your month — here's your reflection.
        </p>
        <div style="background:#f5f3ff;border-radius:12px;padding:24px;border-left:4px solid #7c3aed;">
          ${mdToHtml(content)}
        </div>`
      ),
    });
    console.log(`[Email] Monthly reflection sent to ${to}`);
  } catch (err) {
    console.error("[Email] Failed to send monthly reflection:", err);
  }
}

// ── Habit Nudge ───────────────────────────────────────────────────────────────

export async function sendHabitNudgeEmail(to: string, name: string) {
  if (!process.env.RESEND_API_KEY) return;
  const firstName = name?.split(" ")[0] || "there";
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: `⏰ ${firstName}, your daily check-in is waiting`,
      html: emailShell(
        "linear-gradient(135deg,#f59e0b,#d97706)",
        "⏰",
        "Daily Check-In Reminder",
        "From Zion, your accountability partner",
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#4a4a4a;">
          Hey <strong>${firstName}</strong>, you haven't logged your daily check-in yet today.
        </p>
        <div style="background:#fffbeb;border-radius:12px;padding:24px;border-left:4px solid #f59e0b;margin-bottom:20px;">
          <p style="margin:0 0 10px;font-size:14px;line-height:1.7;color:#4a4a4a;">
            Your daily check-in is one of the most powerful habits you can build. It takes less than 30 seconds and keeps your streak alive.
          </p>
          <p style="margin:0;font-size:14px;line-height:1.7;color:#4a4a4a;">
            Consistency is the foundation of everything you're building. <strong>Be Do Become</strong> — show up, even on the hard days. 💛
          </p>
        </div>
        <p style="margin:0;font-size:13px;color:#8a7a6a;text-align:center;">
          Click below to log your check-in now. It'll take 10 seconds.
        </p>`
      ),
    });
    console.log(`[Email] Habit nudge sent to ${to}`);
  } catch (err) {
    console.error("[Email] Failed to send habit nudge:", err);
  }
}
