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

  const { yaml, api_key, miner_address } = (await req.json()) as {
    yaml: string;
    api_key?: string;
    /** The wallet that will register this YAML — lets the node stage the key now so it's
     *  installed automatically once that wallet's registerMiner tx lands. */
    miner_address?: string;
  };

  if (!yaml) {
    return NextResponse.json({ error: 'yaml is required' }, { status: 400 });
  }

  const upstream = await fetch(`${validatorUrl}/miner-dispatcher/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Secret': internalSecret,
    },
    body: JSON.stringify({ yaml, api_key: api_key ?? '', ...(miner_address ? { miner_address } : {}) }),
  });

  const rawText = await upstream.text();
  if (!upstream.ok) {
    console.error(`[api/validate] upstream ${upstream.status}:`, rawText);
  }

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
