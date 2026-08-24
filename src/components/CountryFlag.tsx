'use client';

import type { ComponentType } from 'react';
import * as Flags from 'country-flag-icons/react/3x2';

interface Props {
  code: string | null | undefined;
  className?: string;
}

/**
 * Real SVG flag (not emoji) — Windows/many Linux fonts render regional-indicator
 * emoji as bare two-letter codes instead of flag glyphs, so emoji flags are unreliable.
 */
export default function CountryFlag({ code, className }: Props) {
  if (!code) return null;
  const Flag = (Flags as Record<string, ComponentType<{ className?: string; title?: string }>>)[code.toUpperCase()];
  if (!Flag) return null;
  return <Flag className={`country-flag-icon ${className ?? ''}`} title={code} />;
}
