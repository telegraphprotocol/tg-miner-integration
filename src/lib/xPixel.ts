declare global {
  interface Window {
    twq?: (...args: unknown[]) => void;
  }
}

export const SIGNUP_EVENT_ID = 'tw-rcv9y-rehk0';
export const TRACK3_REGISTER_EVENT_ID = 'tw-rcv9y-reqvx';

/** Fires the X (Twitter) ads conversion event — call once, right after a signup actually succeeds. */
export function fireSignupConversion(): void {
  if (typeof window === 'undefined' || !window.twq) return;
  window.twq('event', SIGNUP_EVENT_ID, {});
}

/** Fires the X (Twitter) ads conversion event for the Track 3 "Register" button click. */
export function fireTrack3RegisterConversion(): void {
  if (typeof window === 'undefined' || !window.twq) return;
  window.twq('event', TRACK3_REGISTER_EVENT_ID, {});
}
