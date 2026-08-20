import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const validatorUrl = process.env.VALIDATOR_BASE_URL ?? process.env.NEXT_PUBLIC_TELEGRAPH_NODE_URL;

  if (!validatorUrl) {
    return NextResponse.json({ error: 'Registry node not configured on server.' }, { status: 500 });
  }

  const { id } = await params;

  // /api/miners/{id} is the documented contract for miners/frontends (snake_case, includes
  // `retrying`) — /engine/validator/v1/miner-registrations/{id} is an internal surface with
  // Go-cased fields that the API reference explicitly says to prefer this one over.
  const upstream = await fetch(`${validatorUrl}/api/miners/${id}`);
  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}
