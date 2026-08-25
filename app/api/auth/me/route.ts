import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }
  return NextResponse.json({
    email: user.email,
    walletAddresses: user.walletAddresses,
    country: user.country,
    firstName: user.firstName,
    lastName: user.lastName,
    discordUsername: user.discordUsername,
    xUsername: user.xUsername,
    profileLocked: user.profileLocked,
  });
}
