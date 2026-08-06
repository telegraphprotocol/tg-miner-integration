import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const apiKey = process.env.PINATA_API_KEY;
  const apiSecret = process.env.PINATA_API_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      { error: 'Pinata credentials not configured on server.' },
      { status: 500 },
    );
  }

  const incoming = await req.formData();
  const file = incoming.get('file');
  const name = (incoming.get('name') as string | null) ?? 'scorer';

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }

  const formData = new FormData();
  formData.append('file', file, `${name}.wasm`);
  formData.append('pinataMetadata', JSON.stringify({ name }));

  const pinataRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      pinata_api_key: apiKey,
      pinata_secret_api_key: apiSecret,
    },
    body: formData,
  });

  if (!pinataRes.ok) {
    const err = await pinataRes.text();
    return NextResponse.json({ error: err }, { status: pinataRes.status });
  }

  const data = (await pinataRes.json()) as { IpfsHash: string };
  const hash = data.IpfsHash;

  return NextResponse.json({
    hash,
    url: `ipfs://${hash}`,
    gateway: `https://gateway.pinata.cloud/ipfs/${hash}`,
  });
}
