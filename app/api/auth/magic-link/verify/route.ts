import { NextRequest, NextResponse } from 'next/server';
import { signSession, verifyToken, SESSION_COOKIE } from '@/lib/auth';
import { getUsersCollection } from '@/lib/mongodb';

// Note: like the OTP tokens, this is a stateless signed JWT — valid until its
// 15-minute expiry, not single-use. Marking it consumed after first use would
// need a persisted token/jti store, which this pass deliberately skips (see
// plan's "out of scope" — rate limiting / replay hardening is a fast follow).
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  const origin = req.nextUrl.origin;

  if (!token) {
    return NextResponse.redirect(`${origin}/?auth_error=missing_token`);
  }

  const payload = await verifyToken(token, 'magiclink');
  if (!payload) {
    return NextResponse.redirect(`${origin}/?auth_error=expired_link`);
  }

  const email = payload.email as string;
  const users = await getUsersCollection();
  const user = await users.findOne({ email });
  if (!user) {
    return NextResponse.redirect(`${origin}/?auth_error=account_not_found`);
  }

  const session = await signSession({ userId: user._id!.toString(), email: user.email });

  const res = NextResponse.redirect(`${origin}/`);
  res.cookies.set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
