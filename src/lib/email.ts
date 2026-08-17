import nodemailer from 'nodemailer';

export function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.office365.com',
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: {
      user: process.env.OUTLOOK_USER!,
      pass: process.env.OUTLOOK_PASS!,
    },
    tls: { ciphers: 'SSLv3' },
  });
}

function emailShell(eyebrow: string, bodyHtml: string, footerHtml: string): string {
  return `
    <div style="font-family:monospace;background:#000;color:#fff;padding:40px;max-width:480px;margin:0 auto;">
      <p style="color:rgba(120,255,160,0.9);font-size:11px;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 24px;">
        ${eyebrow}
      </p>
      ${bodyHtml}
      <p style="font-size:12px;color:rgba(255,255,255,0.35);margin:32px 0 0;">
        ${footerHtml}
      </p>
    </div>
  `;
}

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"Telegraph" <${process.env.OUTLOOK_USER}>`,
    to,
    subject: 'Your Telegraph verification code',
    html: emailShell(
      'Telegraph · Verify your email',
      `
        <p style="font-size:15px;margin:0 0 32px;color:rgba(255,255,255,0.8);">
          Your verification code is:
        </p>
        <p style="font-size:48px;font-weight:700;letter-spacing:0.12em;color:rgba(120,255,160,0.95);margin:0 0 32px;">
          ${otp}
        </p>
      `,
      "This code expires in 10 minutes. If you didn't request this, ignore this email.",
    ),
  });
}

export async function sendPasswordResetEmail(to: string, otp: string): Promise<void> {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"Telegraph" <${process.env.OUTLOOK_USER}>`,
    to,
    subject: 'Your Telegraph password reset code',
    html: emailShell(
      'Telegraph · Reset your password',
      `
        <p style="font-size:15px;margin:0 0 32px;color:rgba(255,255,255,0.8);">
          Your password reset code is:
        </p>
        <p style="font-size:48px;font-weight:700;letter-spacing:0.12em;color:rgba(120,255,160,0.95);margin:0 0 32px;">
          ${otp}
        </p>
      `,
      "This code expires in 10 minutes. If you didn't request this, ignore this email — your password will stay unchanged.",
    ),
  });
}

export async function sendMagicLinkEmail(to: string, link: string): Promise<void> {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"Telegraph" <${process.env.OUTLOOK_USER}>`,
    to,
    subject: 'Your Telegraph sign-in link',
    html: emailShell(
      'Telegraph · Sign In',
      `
        <p style="font-size:15px;margin:0 0 24px;color:rgba(255,255,255,0.8);">
          Click below to sign in — no password needed.
        </p>
        <p style="margin:0 0 32px;">
          <a href="${link}" style="display:inline-block;background:rgba(120,255,160,0.95);color:#000;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;font-size:12px;padding:12px 24px;text-decoration:none;border-radius:4px;">
            Sign In
          </a>
        </p>
      `,
      "This link expires in 15 minutes and can only be used once. If you didn't request this, ignore this email.",
    ),
  });
}
