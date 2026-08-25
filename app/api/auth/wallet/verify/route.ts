import { NextRequest, NextResponse } from 'next/server';
import { recoverMessageAddress } from 'viem';
import { getSessionUser, buildWalletLinkMessage } from '@/lib/auth';
import { getUsersCollection } from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    }

    const { address, signature } = await req.json();
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address) || !signature) {
      return NextResponse.json({ error: 'Valid address and signature required' }, { status: 400 });
    }

    const users = await getUsersCollection();
    const user = await users.findOne({ email: sessionUser.email });
    if (!user?.walletNonce || !user.walletNonceIssuedAt || !user.walletNonceExpiresAt || user.walletNonceExpiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: 'Nonce expired or missing. Please request a new one.' }, { status: 400 });
    }

    const message = buildWalletLinkMessage({ address, nonce: user.walletNonce, issuedAt: user.walletNonceIssuedAt });

    const recovered = await recoverMessageAddress({ message, signature });
    if (recovered.toLowerCase() !== String(address).toLowerCase()) {
      return NextResponse.json({ error: 'Signature does not match the claimed address.' }, { status: 401 });
    }

    const normalizedAddress = String(address).toLowerCase();
    const linkedElsewhere = await users.findOne({
      $or: [{ walletAddress: normalizedAddress }, { walletAddresses: normalizedAddress }],
      email: { $ne: sessionUser.email },
    });
    if (linkedElsewhere) {
      return NextResponse.json({ error: 'This wallet is already linked to another account.' }, { status: 409 });
    }

    await users.updateOne(
      { email: sessionUser.email },
      {
        $addToSet: { walletAddresses: normalizedAddress },
        $set: { walletNonce: null, walletNonceIssuedAt: null, walletNonceExpiresAt: null },
      },
    );

    return NextResponse.json({ ok: true, walletAddress: normalizedAddress });
  } catch (err) {
    console.error('[wallet/verify]', err);
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
  }
}
