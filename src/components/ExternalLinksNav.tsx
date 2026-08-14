'use client';

import { useEffect, useRef, useState } from 'react';

export interface ExternalLink {
  label: string;
  href: string;
}

export const EXTERNAL_LINKS: ExternalLink[] = [
  { label: 'Telegraph', href: 'https://telegraphprotocol.com/' },
  { label: 'Docs', href: 'https://docs.telegraphprotocol.com' },
  { label: 'Whitepaper', href: 'https://telegraphprotocol.com/Whitepapers%20-%20Telegraph%20Protocol.pdf' },
  { label: 'Explorer', href: 'https://explorer.telegraphprotocol.com/' },
  { label: 'Hackathon', href: 'https://hackathon.telegraphprotocol.com/' },
  { label: 'Discord', href: 'https://discord.gg/telegraphprotocol' },
  { label: 'X', href: 'https://x.com/Telegraphprotoc' },
];

function ExternalArrow() {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  );
}

interface Props {
  mode: 'inline' | 'dropdown';
  onNavigate?: () => void;
}

export default function ExternalLinksNav({ mode, onNavigate }: Props) {
  if (mode === 'inline') {
    return (
      <>
        {EXTERNAL_LINKS.map(link => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="lv2-nav-link"
            onClick={onNavigate}
          >
            {link.label}
            <ExternalArrow />
          </a>
        ))}
      </>
    );
  }

  return <ExternalLinksDropdown />;
}

function ExternalLinksDropdown() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div className="ext-links-wrap" ref={wrapRef}>
      <button
        type="button"
        className="ext-links-trigger"
        aria-label="More Telegraph links"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      </button>

      {open && (
        <div className="ext-links-dropdown">
          {EXTERNAL_LINKS.map(link => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="ext-links-dropdown-item"
              onClick={() => setOpen(false)}
            >
              {link.label}
              <ExternalArrow />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
