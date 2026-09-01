import { NextRequest, NextResponse } from 'next/server';
import { TRACK3_REGISTER_EVENT_ID } from '@/lib/xPixel';
import { fireServerConversion } from '@/lib/xConversionsApi';

export async function POST(req: NextRequest) {
  fireServerConversion({
    eventId: TRACK3_REGISTER_EVENT_ID,
    eventSourceUrl: 'https://integrate.telegraphprotocol.com/track-3',
    ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
    userAgent: req.headers.get('user-agent'),
  }).catch(err => console.error('[track3/register-click] conversion fire failed', err));

  return NextResponse.json({ ok: true });
}
