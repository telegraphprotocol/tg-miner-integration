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

  // A 200 doesn't guarantee the URL points at the raw file — some hosts (e.g. Dropbox
  // share links with dl=0, or a deleted/private file) return an HTML preview or error
  // page with a 200 status instead of a 404. Catch that here rather than letting it
  // masquerade as a YAML parse error downstream.
  const contentType = upstream.headers.get('content-type') ?? '';
  if (contentType.includes('text/html')) {
    return NextResponse.json(
      { error: 'That URL returned an HTML page, not a raw file. If this is a Dropbox share link, use dl=1 (not dl=0) so it serves the file content directly — and make sure the file itself hasn\'t been deleted or made private.' },
      { status: 400 },
    );
  }

  const buf = await upstream.arrayBuffer();
  if (buf.byteLength === 0) {
    return NextResponse.json({ error: 'File is empty.' }, { status: 400 });
  }
  if (buf.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: 'File is too large.' }, { status: 400 });
  }

  const bytes = Buffer.from(buf);
  const text = bytes.toString('utf-8');
  if (/^\s*<(!doctype html|html)/i.test(text)) {
    return NextResponse.json(
      { error: 'That URL returned an HTML page, not a raw file. Check that the link points directly at the file content (e.g. use dl=1 for Dropbox links) and that the file is public and still exists.' },
      { status: 400 },
    );
  }

  const hash = createHash('sha256').update(bytes).digest('hex');
  return NextResponse.json({ hash: `0x${hash}`, yaml: text });
}
