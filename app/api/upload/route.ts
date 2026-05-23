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

  const { yaml, name } = (await req.json()) as { yaml: string; name?: string };

  if (!yaml) {
    return NextResponse.json({ error: 'yaml is required' }, { status: 400 });
  }

  const blob = new Blob([yaml], { type: 'text/yaml' });
  const formData = new FormData();
  formData.append('file', blob, `${name ?? 'miner-config'}.yaml`);
  formData.append(
    'pinataMetadata',
    JSON.stringify({ name: name ?? 'miner-config' }),
  );

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
