export const PASSWORD_REQUIREMENTS_TEXT = 'At least 8 characters, with a lowercase letter, an uppercase letter, and a number.';

/** Returns an error message if the password is too weak, or null if it's fine. */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[a-z]/.test(password)) return 'Password must include a lowercase letter.';
  if (!/[A-Z]/.test(password)) return 'Password must include an uppercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must include a number.';
  return null;
}
