import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(url);
  } catch {
    return NextResponse.json({ error: 'Could not fetch that URL.' }, { status: 400 });
  }
  if (!upstream.ok) {
    return NextResponse.json({ error: `URL returned ${upstream.status}.` }, { status: 400 });
  }

  const buf = await upstream.arrayBuffer();
  if (buf.byteLength === 0) {
    return NextResponse.json({ error: 'File is empty.' }, { status: 400 });
  }
  if (buf.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: 'File is too large.' }, { status: 400 });
  }

  const hash = createHash('sha256').update(Buffer.from(buf)).digest('hex');
  return NextResponse.json({ hash: `0x${hash}` });
}
