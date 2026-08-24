import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getUsersCollection } from '@/lib/mongodb';
import { isValidCountryCode } from '@/countries';

const MAX_LEN = 60;

function clean(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/^@/, '');
  if (!trimmed) return null;
  if (trimmed.length > MAX_LEN) throw new Error(`Must be ${MAX_LEN} characters or fewer.`);
  return trimmed;
}

/**
 * First/last name are permanent once set (profileLocked) — Discord and X handles are
 * optional and stay editable anytime, so they're excluded from the lock entirely.
 */
export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    }

    const users = await getUsersCollection();
    const existing = await users.findOne({ email: sessionUser.email });
    if (!existing) {
      return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    }

    const body = await req.json();
    const updatingName = 'firstName' in body || 'lastName' in body;
    const updatingCountry = 'country' in body;

    if (updatingName && existing.profileLocked) {
      return NextResponse.json({ error: 'Your name is locked and cannot be changed.' }, { status: 409 });
    }
    if (updatingCountry && existing.country) {
      return NextResponse.json({ error: 'Your country is locked and cannot be changed.' }, { status: 409 });
    }

    const set: Record<string, unknown> = {};
    try {
      if ('discordUsername' in body) set.discordUsername = clean(body.discordUsername);
      if ('xUsername' in body) set.xUsername = clean(body.xUsername);
      if (updatingName) {
        set.firstName = clean(body.firstName);
        set.lastName = clean(body.lastName);
        set.profileLocked = true;
      }
      if (updatingCountry) {
        const countryCode = String(body.country ?? '').toUpperCase();
        if (!isValidCountryCode(countryCode)) throw new Error('A valid country is required.');
        set.country = countryCode;
      }
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 400 });
    }

    await users.updateOne({ email: sessionUser.email }, { $set: set });

    const updated = await users.findOne({ email: sessionUser.email });
    return NextResponse.json({
      ok: true,
      firstName: updated!.firstName,
      lastName: updated!.lastName,
      discordUsername: updated!.discordUsername,
      xUsername: updated!.xUsername,
      profileLocked: updated!.profileLocked,
      country: updated!.country,
    });
  } catch (err) {
    console.error('[profile]', err);
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
  }
}
