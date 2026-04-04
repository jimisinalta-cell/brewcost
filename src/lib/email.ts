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
