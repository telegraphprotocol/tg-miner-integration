import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const validatorUrl = process.env.VALIDATOR_BASE_URL;

  if (!validatorUrl) {
    return NextResponse.json({ error: 'Validator not configured on server.' }, { status: 500 });
  }

  const { slug, key_hash } = (await req.json()) as { slug?: string; key_hash?: string };

  if (!slug || !key_hash) {
    return NextResponse.json({ error: 'slug and key_hash are required' }, { status: 400 });
  }

  const upstream = await fetch(
    `${validatorUrl}/miner-dispatcher/miners/${encodeURIComponent(slug)}/api-key/challenge`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key_hash }),
    },
  );

  const rawText = await upstream.text();
  let data: unknown;
  try {
    data = JSON.parse(rawText);
  } catch {
    return NextResponse.json(
      { error: rawText || `Validator returned a non-JSON ${upstream.status} response.` },
      { status: upstream.status },
    );
  }

  return NextResponse.json(data, { status: upstream.status });
}
