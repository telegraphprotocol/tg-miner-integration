import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, verifyToken, validatePasswordStrength, resetLoginLockout } from '@/lib/auth';
import { getUsersCollection } from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  try {
    const { token, otp, password } = await req.json();
    if (!token || !otp || !password) {
      return NextResponse.json({ error: 'Missing token, code, or password' }, { status: 400 });
    }
    const passwordError = validatePasswordStrength(String(password));
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const payload = await verifyToken(token, 'password-reset');
    if (!payload) {
      return NextResponse.json({ error: 'Code expired. Please request a new one.' }, { status: 401 });
    }
    if (String(payload.otp) !== String(otp)) {
      return NextResponse.json({ error: 'Incorrect code. Please try again.' }, { status: 401 });
    }

    const email = payload.email as string;
    const users = await getUsersCollection();
    const user = await users.findOne({ email });
    if (!user) {
      // Same generic response as an expired/wrong code — never reveal whether the account exists.
      return NextResponse.json({ error: 'Incorrect code. Please try again.' }, { status: 401 });
    }

    const passwordHash = await hashPassword(password);
    await users.updateOne({ email }, { $set: { passwordHash } });
    await resetLoginLockout(email);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[password-reset/verify-otp]', err);
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
  }
}
