import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = process.env.EMAIL_FROM || "Be Do Become <hello@bedobecome.com>";
const APP_URL = process.env.APP_URL || "https://bdbplanner.com";

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
      subject: "Welcome to BDB Digital Planner 🌟",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to BDB Planner</title>
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
              <h1 style="margin:0;font-size:32px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">BDB Digital Planner</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;font-size:24px;font-weight:800;color:#1a1a1a;">Welcome, ${firstName}! 🌟</h2>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#4a4a4a;">
                You've just taken a powerful step toward your best year. The BDB Digital Planner is your personal command centre for turning your vision into reality.
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
                BDB Digital Planner by <strong>Leah Marville</strong> · Be Do Become Wellness<br />
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
      subject: "Reset your BDB Planner password",
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
            <p style="margin:0;font-size:12px;color:#b0a090;">BDB Digital Planner by <strong>Leah Marville</strong> · Be Do Become Wellness</p>
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
