import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, signSession, verifyToken, validatePasswordStrength, SESSION_COOKIE } from '@/lib/auth';
import { getUsersCollection } from '@/lib/mongodb';
import { isValidCountryCode } from '@/countries';

export async function POST(req: NextRequest) {
  try {
    const { token, otp, password, country } = await req.json();
    if (!token || !otp || !password) {
      return NextResponse.json({ error: 'Missing token, code, or password' }, { status: 400 });
    }
    const passwordError = validatePasswordStrength(String(password));
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }
    const countryCode = String(country ?? '').toUpperCase();
    if (!isValidCountryCode(countryCode)) {
      return NextResponse.json({ error: 'A valid country is required.' }, { status: 400 });
    }

    const payload = await verifyToken(token, 'signup');
    if (!payload) {
      return NextResponse.json({ error: 'Code expired. Please request a new one.' }, { status: 401 });
    }
    if (String(payload.otp) !== String(otp)) {
      return NextResponse.json({ error: 'Incorrect code. Please try again.' }, { status: 401 });
    }

    const email = payload.email as string;
    const users = await getUsersCollection();

    const existing = await users.findOne({ email });
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const result = await users.insertOne({
      email,
      passwordHash,
      walletNonce: null,
      walletNonceIssuedAt: null,
      walletNonceExpiresAt: null,
      country: countryCode,
      firstName: null,
      lastName: null,
      discordUsername: null,
      xUsername: null,
      profileLocked: false,
      createdAt: new Date(),
      failedLoginAttempts: 0,
      loginLockedUntil: null,
    });

    const session = await signSession({ userId: result.insertedId.toString(), email });

    const res = NextResponse.json({ ok: true, email });
    res.cookies.set(SESSION_COOKIE, session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (err) {
    console.error('[signup/verify-otp]', err);
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
  }
}
