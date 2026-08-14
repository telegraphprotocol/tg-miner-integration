import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import type { NextRequest } from 'next/server';
import { getUsersCollection } from './mongodb';

export const SESSION_COOKIE = 'tg_session';

function secret(): Uint8Array {
  const raw = process.env.AUTH_JWT_SECRET;
  if (!raw) throw new Error('AUTH_JWT_SECRET is not configured on the server.');
  return new TextEncoder().encode(raw);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export { validatePasswordStrength, PASSWORD_REQUIREMENTS_TEXT } from './passwordRules';

// ── Purpose-tagged JWTs — one secret, disambiguated by a `purpose` claim,
// used for the session cookie, signup OTP tokens, and magic-link tokens. ──

export async function signToken(payload: object, purpose: string, expiresIn: string): Promise<string> {
  return new SignJWT({ ...payload, purpose })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret());
}

export async function verifyToken(token: string, purpose: string): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.purpose !== purpose) return null;
    return payload;
  } catch {
    return null;
  }
}

export interface SessionPayload {
  userId: string;
  email: string;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return signToken(payload, 'session', '30d');
}

export const WALLET_UNLINK_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

export interface AuthedUser {
  id: string;
  email: string;
  walletAddress: string | null;
  /** ISO timestamp — null unless a delink cooldown is currently active. */
  walletUnlinkCooldownUntil: string | null;
  firstName: string | null;
  lastName: string | null;
  discordUsername: string | null;
  xUsername: string | null;
  profileLocked: boolean;
}

export async function getSessionUser(req: NextRequest): Promise<AuthedUser | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifyToken(token, 'session');
  if (!payload) return null;

  const userId = payload.userId as string;
  if (!ObjectId.isValid(userId)) return null;

  const users = await getUsersCollection();
  const user = await users.findOne({ _id: new ObjectId(userId) });
  if (!user) return null;

  const cooldownUntilMs = user.walletUnlinkedAt ? user.walletUnlinkedAt.getTime() + WALLET_UNLINK_COOLDOWN_MS : 0;
  const walletUnlinkCooldownUntil = cooldownUntilMs > Date.now() ? new Date(cooldownUntilMs).toISOString() : null;

  return {
    id: user._id!.toString(),
    email: user.email,
    walletAddress: user.walletAddress,
    walletUnlinkCooldownUntil,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    discordUsername: user.discordUsername ?? null,
    xUsername: user.xUsername ?? null,
    profileLocked: user.profileLocked ?? false,
  };
}

// ── SIWE-style wallet-link message — built server-side from a stored nonce
// so the client can display exactly what it's signing, and the server can
// independently reconstruct the same text to verify against (never trusts
// client-submitted message text). ──

export function buildWalletLinkMessage(params: { address: string; nonce: string; issuedAt: string }): string {
  const { address, nonce, issuedAt } = params;
  return [
    'Link this wallet to your Telegraph account.',
    '',
    `Address: ${address}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join('\n');
}
