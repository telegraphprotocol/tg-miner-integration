import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const validatorUrl = process.env.VALIDATOR_BASE_URL;
  const internalSecret = process.env.INTERNAL_SECRET;

  if (!validatorUrl || !internalSecret) {
    return NextResponse.json(
      { error: 'Validator not configured on server.' },
      { status: 500 },
    );
  }

  const { yaml, api_key } = (await req.json()) as { yaml: string; api_key: string };

  if (!yaml || !api_key) {
    return NextResponse.json({ error: 'yaml and api_key are required' }, { status: 400 });
  }

  const upstream = await fetch(`${validatorUrl}/miner-dispatcher/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Secret': internalSecret,
    },
    body: JSON.stringify({ yaml, api_key }),
  });

  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}
