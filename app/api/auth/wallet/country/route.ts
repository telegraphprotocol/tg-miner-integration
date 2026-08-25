import { NextRequest, NextResponse } from 'next/server';
import { getUsersCollection } from '@/lib/mongodb';

// Public, unauthenticated — queried by the validator/leaderboard backend to resolve
// a miner registrant's country from the wallet address used to register on-chain.
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address');
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: 'Valid address required' }, { status: 400 });
  }

  const users = await getUsersCollection();
  const normalizedAddress = address.toLowerCase();
  const user = await users.findOne({ $or: [{ walletAddress: normalizedAddress }, { walletAddresses: normalizedAddress }] });

  return NextResponse.json({ country: user?.country ?? 'Global' });
}
