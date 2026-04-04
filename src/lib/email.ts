import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || "jim@wydahoroaster.com";
const FROM_EMAIL = process.env.SMTP_USER || "wydahoroaster@gmail.com";

export async function notifyNewSignup(userEmail: string) {
  try {
    await transporter.sendMail({
      from: `"BrewCost" <${FROM_EMAIL}>`,
      to: NOTIFY_EMAIL,
      subject: "New BrewCost Signup",
      html: `
        <div style="font-family:sans-serif;max-width:480px;padding:24px;">
          <h2 style="color:#2d1f0e;margin:0 0 12px;">New Free Signup</h2>
          <p style="color:#6b4d30;font-size:14px;">
            <strong>${userEmail}</strong> just created a free BrewCost account.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Failed to send signup notification:", err);
  }
}

export async function sendContactMessage({
  userEmail,
  plan,
  category,
  message,
}: {
  userEmail: string;
  plan: string;
  category: string;
  message: string;
}) {
  const planBadge =
    plan === "paid"
      ? '<span style="background:#16a34a;color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">Pro</span>'
      : '<span style="background:#b8943a;color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">Free</span>';

  await transporter.sendMail({
    from: `"BrewCost" <${FROM_EMAIL}>`,
    to: NOTIFY_EMAIL,
    replyTo: userEmail,
    subject: `[BrewCost] ${category} from ${userEmail}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;padding:24px;">
        <h2 style="color:#2d1f0e;margin:0 0 16px;">New ${category}</h2>
        <table style="font-size:14px;color:#6b4d30;margin-bottom:16px;">
          <tr><td style="padding:4px 12px 4px 0;font-weight:600;">From</td><td>${userEmail}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Plan</td><td>${planBadge}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Category</td><td>${category}</td></tr>
        </table>
        <div style="background:#faf6eb;border:1px solid #e8d5a0;border-radius:8px;padding:16px;font-size:14px;color:#2d1f0e;line-height:1.6;white-space:pre-wrap;">${message}</div>
        <p style="color:#b8943a;font-size:11px;margin:16px 0 0;">Reply directly to this email to respond to the user.</p>
      </div>
    `,
  });
}

export async function notifyUpgrade(userEmail: string) {
  try {
    await transporter.sendMail({
      from: `"BrewCost" <${FROM_EMAIL}>`,
      to: NOTIFY_EMAIL,
      subject: "BrewCost Upgrade — New Pro Subscriber",
      html: `
        <div style="font-family:sans-serif;max-width:480px;padding:24px;">
          <h2 style="color:#2d1f0e;margin:0 0 12px;">New Pro Subscriber!</h2>
          <p style="color:#6b4d30;font-size:14px;">
            <strong>${userEmail}</strong> just upgraded to BrewCost Pro ($2.50/mo).
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Failed to send upgrade notification:", err);
  }
}
