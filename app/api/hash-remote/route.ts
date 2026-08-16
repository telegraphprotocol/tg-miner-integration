import { NextRequest, NextResponse } from 'next/server';
import { keccak256 } from 'viem';

const MAX_BYTES = 32 * 1024 * 1024;

/**
 * Rewrites known share-link formats into their direct-download form. Dropbox
 * share links default to a preview page unless dl=1 is forced. Any other host
 * is left as-is and just fetched directly — we don't gate on which service it is,
 * only on whether the link is actually publicly downloadable.
 */
function normalizeUrl(raw: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  if (host === 'www.dropbox.com' || host === 'dropbox.com') {
    parsed.searchParams.set('dl', '1');
  }

  return parsed.toString();
}

export async function POST(req: NextRequest) {
  const { url } = (await req.json()) as { url?: string };
  if (!url || !url.trim()) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  const directUrl = normalizeUrl(url.trim());
  if (!directUrl) {
    return NextResponse.json({ error: 'Enter a valid URL.' }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(directUrl, { redirect: 'follow' });
  } catch {
    return NextResponse.json({ error: 'Could not reach that link. Check it is public and try again.' }, { status: 502 });
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: `Link is not publicly downloadable (HTTP ${res.status}). Make sure sharing is set to "Anyone with the link".` },
      { status: 400 },
    );
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('text/html')) {
    return NextResponse.json(
      { error: "That link returns a webpage, not a file — it's probably a preview/login page, not a direct download link." },
      { status: 400 },
    );
  }

  const contentLength = Number(res.headers.get('content-length') ?? '0');
  if (contentLength > MAX_BYTES) {
    return NextResponse.json({ error: 'Binary exceeds the 32 MB limit.' }, { status: 413 });
  }

  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength === 0) {
    return NextResponse.json({ error: 'Downloaded file is empty.' }, { status: 400 });
  }
  if (buf.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: 'Binary exceeds the 32 MB limit.' }, { status: 413 });
  }

  const hash = keccak256(buf);

  return NextResponse.json({ hash, url: directUrl, size: buf.byteLength });
}
