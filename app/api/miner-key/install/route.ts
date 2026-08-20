import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const validatorUrl = process.env.VALIDATOR_BASE_URL;

  if (!validatorUrl) {
    return NextResponse.json({ error: 'Validator not configured on server.' }, { status: 500 });
  }

  const { slug, nonce, signature, api_key } = (await req.json()) as {
    slug?: string;
    nonce?: string;
    signature?: string;
    api_key?: string;
  };

  if (!slug || !nonce || !signature || !api_key) {
    return NextResponse.json({ error: 'slug, nonce, signature and api_key are required' }, { status: 400 });
  }

  const upstream = await fetch(`${validatorUrl}/miner-dispatcher/miners/${encodeURIComponent(slug)}/api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nonce, signature, api_key }),
  });

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
