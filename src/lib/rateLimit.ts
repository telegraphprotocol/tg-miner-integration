import type { NextRequest } from 'next/server';
import { getRateLimitsCollection } from './mongodb';

/** Best-effort caller IP from the reverse proxy's forwarded-for header. */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterMs?: number;
}

/**
 * Fixed-window counter backed by a TTL-indexed Mongo collection — the
 * window resets naturally when the document expires, no cleanup job needed.
 */
export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const col = await getRateLimitsCollection();
  const now = new Date();

  const existing = await col.findOne({ key });
  if (existing && existing.expiresAt > now) {
    if (existing.count >= limit) {
      return { ok: false, retryAfterMs: existing.expiresAt.getTime() - now.getTime() };
    }
    await col.updateOne({ key }, { $inc: { count: 1 } });
    return { ok: true };
  }

  await col.updateOne(
    { key },
    { $set: { count: 1, expiresAt: new Date(now.getTime() + windowMs) } },
    { upsert: true },
  );
  return { ok: true };
}

export function retryAfterMessage(retryAfterMs: number | undefined): string {
  const minutes = Math.max(1, Math.ceil((retryAfterMs ?? 0) / 60000));
  return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
}
