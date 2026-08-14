import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '@/lib/auth';
import { sendMagicLinkEmail } from '@/lib/email';
import { getUsersCollection } from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }
    const normalizedEmail = String(email).trim().toLowerCase();

    // Always respond the same way regardless of whether the account exists,
    // so this endpoint can't be used to enumerate registered emails.
    const users = await getUsersCollection();
    const user = await users.findOne({ email: normalizedEmail });

    if (user) {
      const token = await signToken({ email: normalizedEmail }, 'magiclink', '15m');
      const link = `${req.nextUrl.origin}/api/auth/magic-link/verify?token=${encodeURIComponent(token)}`;
      await sendMagicLinkEmail(normalizedEmail, link);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[magic-link/request]', err);
    return NextResponse.json({ error: 'Failed to send link. Please try again.' }, { status: 500 });
  }
}
