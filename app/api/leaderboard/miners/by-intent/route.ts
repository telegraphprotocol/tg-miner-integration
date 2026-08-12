import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const validatorUrl = process.env.VALIDATOR_BASE_URL ?? process.env.NEXT_PUBLIC_TELEGRAPH_NODE_URL;

  if (!validatorUrl) {
    return NextResponse.json({ error: 'Registry node not configured on server.' }, { status: 500 });
  }

  const limit = req.nextUrl.searchParams.get('limit') ?? '10';

  const upstream = await fetch(`${validatorUrl}/leaderboard/miners/by-intent?limit=${limit}`);
  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}
