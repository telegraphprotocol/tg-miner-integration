import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '@/lib/auth';
import { sendOtpEmail } from '@/lib/email';
import { getUsersCollection } from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }
    const normalizedEmail = String(email).trim().toLowerCase();

    const users = await getUsersCollection();
    const existing = await users.findOne({ email: normalizedEmail });
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const token = await signToken({ email: normalizedEmail, otp }, 'signup', '10m');

    await sendOtpEmail(normalizedEmail, otp);

    return NextResponse.json({ token });
  } catch (err) {
    console.error('[signup/request-otp]', err);
    return NextResponse.json({ error: 'Failed to send code. Please try again.' }, { status: 500 });
  }
}
