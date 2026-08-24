import { NextRequest, NextResponse } from 'next/server';
import { isValidCountryCode } from '@/countries';

function clientIp(req: NextRequest): string | null {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip');
}

// Best-effort IP → country guess, used only to prefill the country selector —
// never trusted for anything security- or compliance-relevant. The user can
// always confirm or change it before it's saved.
export async function GET(req: NextRequest) {
  const ip = clientIp(req);
  // No usable forwarded-for header (local dev, or no reverse proxy in front yet) —
  // fall back to ipwho.is auto-detecting our own outbound IP, which is at least
  // correct for local dev testing rather than always returning null.
  const isLoopback = !ip || ip === '127.0.0.1' || ip === '::1';
  const lookupUrl = isLoopback ? 'https://ipwho.is/' : `https://ipwho.is/${ip}`;

  try {
    const res = await fetch(lookupUrl, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return NextResponse.json({ country: null });
    const data = await res.json();
    const code = String(data.country_code ?? '').toUpperCase();
    return NextResponse.json({ country: isValidCountryCode(code) ? code : null });
  } catch {
    return NextResponse.json({ country: null });
  }
}
