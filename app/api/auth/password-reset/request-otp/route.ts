import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '@/lib/auth';
import { sendPasswordResetEmail } from '@/lib/email';
import { getUsersCollection } from '@/lib/mongodb';
import { checkRateLimit, getClientIp, retryAfterMessage } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }
    const normalizedEmail = String(email).trim().toLowerCase();

    const ip = getClientIp(req);
    const [ipLimit, emailLimit] = await Promise.all([
      checkRateLimit(`pwreset-otp:${ip}`, 10, 60 * 60 * 1000),
      checkRateLimit(`pwreset-otp:${normalizedEmail}`, 3, 60 * 60 * 1000),
    ]);
    if (!ipLimit.ok || !emailLimit.ok) {
      return NextResponse.json(
        { error: retryAfterMessage(ipLimit.ok ? emailLimit.retryAfterMs : ipLimit.retryAfterMs) },
        { status: 429 },
      );
    }

    // A token is always issued and the response shape never varies by whether
    // the account exists — only the email-send below is conditional — so this
    // endpoint can't be used to enumerate registered emails via response shape.
    const users = await getUsersCollection();
    const user = await users.findOne({ email: normalizedEmail });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const token = await signToken({ email: normalizedEmail, otp }, 'password-reset', '10m');

    if (user) {
      await sendPasswordResetEmail(normalizedEmail, otp);
    }

    return NextResponse.json({ ok: true, token });
  } catch (err) {
    console.error('[password-reset/request-otp]', err);
    return NextResponse.json({ error: 'Failed to send code. Please try again.' }, { status: 500 });
  }
}
