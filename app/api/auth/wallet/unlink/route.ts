import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, WALLET_UNLINK_COOLDOWN_MS } from '@/lib/auth';
import { getUsersCollection } from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    }

    const users = await getUsersCollection();
    const user = await users.findOne({ email: sessionUser.email });
    if (!user?.walletAddress) {
      return NextResponse.json({ error: 'No wallet is linked to this account.' }, { status: 400 });
    }

    if (user.walletUnlinkedAt) {
      const cooldownUntilMs = user.walletUnlinkedAt.getTime() + WALLET_UNLINK_COOLDOWN_MS;
      if (cooldownUntilMs > Date.now()) {
        const remainingDays = Math.ceil((cooldownUntilMs - Date.now()) / (24 * 60 * 60 * 1000));
        return NextResponse.json(
          {
            error: `You can only delink a wallet once every 14 days. Try again in ${remainingDays} day${remainingDays === 1 ? '' : 's'}.`,
            walletUnlinkCooldownUntil: new Date(cooldownUntilMs).toISOString(),
          },
          { status: 429 },
        );
      }
    }

    const now = new Date();
    await users.updateOne(
      { email: sessionUser.email },
      { $unset: { walletAddress: '' }, $set: { walletUnlinkedAt: now } },
    );

    return NextResponse.json({ ok: true, walletUnlinkCooldownUntil: new Date(now.getTime() + WALLET_UNLINK_COOLDOWN_MS).toISOString() });
  } catch (err) {
    console.error('[wallet/unlink]', err);
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
  }
}
