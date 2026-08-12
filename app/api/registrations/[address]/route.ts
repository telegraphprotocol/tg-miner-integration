import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ address: string }> }) {
  const validatorUrl = process.env.VALIDATOR_BASE_URL ?? process.env.NEXT_PUBLIC_TELEGRAPH_NODE_URL;

  if (!validatorUrl) {
    return NextResponse.json({ error: 'Registry node not configured on server.' }, { status: 500 });
  }

  const { address } = await params;

  const upstream = await fetch(`${validatorUrl}/engine/validator/v1/addresses/${address}`);
  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}
