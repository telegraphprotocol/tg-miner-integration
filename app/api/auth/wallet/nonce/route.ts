import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, buildWalletLinkMessage } from '@/lib/auth';
import { getUsersCollection } from '@/lib/mongodb';

const NONCE_TTL_MS = 5 * 60 * 1000;

export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const address = req.nextUrl.searchParams.get('address');
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: 'Valid wallet address required' }, { status: 400 });
  }

  const nonce = randomBytes(16).toString('hex');
  const now = Date.now();
  const issuedAt = new Date(now).toISOString();

  const users = await getUsersCollection();
  await users.updateOne(
    { email: sessionUser.email },
    { $set: { walletNonce: nonce, walletNonceIssuedAt: issuedAt, walletNonceExpiresAt: new Date(now + NONCE_TTL_MS) } },
  );

  const message = buildWalletLinkMessage({ address, nonce, issuedAt });
  return NextResponse.json({ message, nonce, issuedAt });
}
