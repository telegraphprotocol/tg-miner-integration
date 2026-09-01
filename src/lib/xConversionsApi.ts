const CONVERSIONS_ENDPOINT = 'https://ads-api.x.com/12/measurement/conversions/rcv9y';

interface FireServerConversionParams {
  eventId: string;
  conversionId?: string;
  eventSourceUrl?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Fires an X (Twitter) Ads conversion via the server-side Conversions API — a
 * redundant, ad-blocker-proof companion to the client-side twq() pixel event.
 * Requires at least one identifier (ip_address+user_agent, twclid, or a hashed
 * email/phone); silently no-ops otherwise since the API would reject the call.
 */
export async function fireServerConversion(params: FireServerConversionParams): Promise<void> {
  const token = process.env.X_PIXEL_TOKEN;
  if (!token) return;

  const identifiers: Record<string, string> = {};
  if (params.ipAddress) identifiers.ip_address = params.ipAddress;
  if (params.userAgent) identifiers.user_agent = params.userAgent;
  if (Object.keys(identifiers).length === 0) return;

  try {
    const res = await fetch(CONVERSIONS_ENDPOINT, {
      method: 'POST',
      headers: {
        'X-Pixel-Token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversions: [
          {
            conversion_time: new Date().toISOString(),
            event_id: params.eventId,
            ...(params.eventSourceUrl ? { event_source_url: params.eventSourceUrl } : {}),
            ...(params.conversionId ? { conversion_id: params.conversionId } : {}),
            identifiers: [identifiers],
          },
        ],
      }),
    });
    if (!res.ok) {
      console.error('[xConversionsApi] non-OK response', res.status, await res.text());
    }
  } catch (err) {
    console.error('[xConversionsApi] request failed', err);
  }
}
