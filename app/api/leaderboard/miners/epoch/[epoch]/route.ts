import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ epoch: string }> }) {
  const validatorUrl = process.env.VALIDATOR_BASE_URL ?? process.env.NEXT_PUBLIC_TELEGRAPH_NODE_URL;

  if (!validatorUrl) {
    return NextResponse.json({ error: 'Registry node not configured on server.' }, { status: 500 });
  }

  const { epoch } = await params;
  const limit = req.nextUrl.searchParams.get('limit') ?? '10';
  const intent = req.nextUrl.searchParams.get('intent');

  const qs = new URLSearchParams({ limit });
  if (intent) qs.set('intent', intent);

  const upstream = await fetch(`${validatorUrl}/leaderboard/miners/epoch/${epoch}?${qs.toString()}`);
  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}
