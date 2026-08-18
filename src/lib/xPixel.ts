declare global {
  interface Window {
    twq?: (...args: unknown[]) => void;
  }
}

const SIGNUP_EVENT_ID = 'tw-rcv9y-rehk0';

/** Fires the X (Twitter) ads conversion event — call once, right after a signup actually succeeds. */
export function fireSignupConversion(): void {
  if (typeof window === 'undefined' || !window.twq) return;
  window.twq('event', SIGNUP_EVENT_ID, {});
}
