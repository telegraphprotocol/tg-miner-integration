import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, signSession, SESSION_COOKIE, LOGIN_MAX_ATTEMPTS, LOGIN_LOCKOUT_MS } from '@/lib/auth';
import { getUsersCollection } from '@/lib/mongodb';
import { checkRateLimit, getClientIp, retryAfterMessage } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }
    const normalizedEmail = String(email).trim().toLowerCase();

    const ip = getClientIp(req);
    const ipLimit = await checkRateLimit(`login:${ip}`, 20, 60 * 60 * 1000);
    if (!ipLimit.ok) {
      return NextResponse.json({ error: retryAfterMessage(ipLimit.retryAfterMs) }, { status: 429 });
    }

    const users = await getUsersCollection();
    const user = await users.findOne({ email: normalizedEmail });
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    if (user.loginLockedUntil && user.loginLockedUntil.getTime() > Date.now()) {
      const remainingMinutes = Math.ceil((user.loginLockedUntil.getTime() - Date.now()) / 60000);
      return NextResponse.json(
        { error: `Too many failed attempts. Try again in ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}.` },
        { status: 429 },
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      const attempts = (user.failedLoginAttempts ?? 0) + 1;
      if (attempts >= LOGIN_MAX_ATTEMPTS) {
        await users.updateOne(
          { email: normalizedEmail },
          { $set: { failedLoginAttempts: 0, loginLockedUntil: new Date(Date.now() + LOGIN_LOCKOUT_MS) } },
        );
      } else {
        await users.updateOne({ email: normalizedEmail }, { $set: { failedLoginAttempts: attempts } });
      }
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    await users.updateOne({ email: normalizedEmail }, { $set: { failedLoginAttempts: 0, loginLockedUntil: null } });

    const session = await signSession({ userId: user._id!.toString(), email: user.email });

    const res = NextResponse.json({ ok: true, email: user.email });
    res.cookies.set(SESSION_COOKIE, session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (err) {
    console.error('[login]', err);
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
  }
}
