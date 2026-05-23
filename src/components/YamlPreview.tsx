'use client';

interface Props {
  yaml: string;
}

function highlightYaml(text: string): string {
  return text
    .split('\n')
    .map(line => {
      if (line.startsWith('#')) {
        return `<span class="yaml-comment">${esc(line)}</span>`;
      }
      if (line === '') return '';

      // key: value
      const kvMatch = line.match(/^(\s*)([\w_]+)(:)(\s+)(.+)$/);
      if (kvMatch) {
        const [, indent, key, colon, space, val] = kvMatch;
        const valClass = val.startsWith('"') ? 'yaml-string'
          : /^[0-9.]+$/.test(val.trim()) ? 'yaml-number'
          : val.startsWith('0x') ? 'yaml-address'
          : 'yaml-value';
        return `${esc(indent)}<span class="yaml-key">${esc(key)}</span><span class="yaml-colon">${esc(colon)}</span>${esc(space)}<span class="${valClass}">${esc(val)}</span>`;
      }

      // key: (no value — section header)
      const secMatch = line.match(/^(\s*)([\w_]+)(:)\s*$/);
      if (secMatch) {
        const [, indent, key, colon] = secMatch;
        return `${esc(indent)}<span class="yaml-section">${esc(key)}</span><span class="yaml-colon">${esc(colon)}</span>`;
      }

      // list item
      const listMatch = line.match(/^(\s*)(-)(\s+)(.+)$/);
      if (listMatch) {
        const [, indent, dash, space, val] = listMatch;
        return `${esc(indent)}<span class="yaml-dash">${esc(dash)}</span>${esc(space)}<span class="yaml-value">${esc(val)}</span>`;
      }

      return esc(line);
    })
    .join('\n');
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default function YamlPreview({ yaml }: Props) {
  const isEmpty = !yaml.replace(/^#.*$/gm, '').trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(yaml).catch(() => {});
  };

  return (
    <div className="yaml-preview">
      <div className="yaml-preview-header">
        <span className="yaml-preview-label">YAML PREVIEW</span>
        <button className="yaml-copy-btn" onClick={handleCopy} title="Copy to clipboard">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="9" y="9" width="13" height="13" rx="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          COPY
        </button>
      </div>

      <div className="yaml-preview-body">
        {isEmpty ? (
          <div className="yaml-empty">
            <div className="yaml-empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <p>Fill in the form to generate your YAML</p>
          </div>
        ) : (
          <pre
            className="yaml-code"
            dangerouslySetInnerHTML={{ __html: highlightYaml(yaml) }}
          />
        )}
      </div>
    </div>
  );
}
