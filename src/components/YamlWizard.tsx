'use client';

import { useState, type ReactNode } from 'react';
import type { FormState } from '../types';
import YamlPreview from './YamlPreview';
import { generateYaml } from '../yamlGen';
import BasicsSection from './sections/BasicsSection';
import ConnectionSection from './sections/ConnectionSection';
import EndpointsSection from './sections/EndpointsSection';
import SemanticsSection from './sections/SemanticsSection';
import OnChainSection from './sections/OnChainSection';
import AdvancedSection from './sections/AdvancedSection';

interface Props {
  state: FormState;
  onChange: (key: keyof FormState, value: unknown) => void;
  onNext: () => void;
}

interface SectionMeta {
  id: string;
  label: string;
  requiredFilled: (s: FormState) => boolean;
  icon: ReactNode;
}

function Icon({ d }: { d: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d={d} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

const SECTIONS: SectionMeta[] = [
  {
    id: 'basics',
    label: 'Basics',
    requiredFilled: s => !!(s.kind && s.id && s.slug && s.name),
    icon: <Icon d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
  },
  {
    id: 'connection',
    label: 'Connection',
    requiredFilled: s => !!s.base_url,
    icon: <Icon d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />,
  },
  {
    id: 'endpoints',
    label: 'Endpoints',
    requiredFilled: s => s.endpoints.length > 0 && s.endpoints.some(e => !!e.path),
    icon: <Icon d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
  },
  {
    id: 'semantics',
    label: 'Semantics',
    requiredFilled: s => !!(s.semantics_signal_type && s.semantics_intents.length > 0),
    icon: <Icon d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />,
  },
  {
    id: 'onchain',
    label: 'On-Chain',
    requiredFilled: s => !s.onchain_enabled || (
      (s.onchain_strings.length > 0 || s.onchain_integers.length > 0 || s.onchain_bools.length > 0) &&
      s.onchain_request.length > 0
    ),
    icon: <Icon d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />,
  },
  {
    id: 'advanced',
    label: 'Advanced',
    requiredFilled: () => true,
    icon: <Icon d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />,
  },
];

export default function YamlWizard({ state, onChange, onNext }: Props) {
  const [activeSection, setActiveSection] = useState('basics');
  const [visited, setVisited] = useState<Set<string>>(new Set(['basics']));

  const handleSectionChange = (id: string) => {
    setActiveSection(id);
    setVisited(prev => new Set(prev).add(id));
  };

  const yaml = generateYaml(state);
  const secIdx = SECTIONS.findIndex(s => s.id === activeSection);
  const sec = SECTIONS[secIdx];
  const isLast = secIdx === SECTIONS.length - 1;
  const completedCount = SECTIONS.filter(s => visited.has(s.id) && s.requiredFilled(state)).length;

  const missingFields: string[] = [];
  if (!state.kind)     missingFields.push('Kind (Basics)');
  if (!state.id)       missingFields.push('Integration ID (Basics)');
  if (!state.slug)     missingFields.push('Slug (Basics)');
  if (!state.name)     missingFields.push('Name (Basics)');
  if (!state.base_url) missingFields.push('Base URL (Connection)');
  const allBasicsOk = missingFields.length === 0;

  const renderSection = () => {
    switch (activeSection) {
      case 'basics': return <BasicsSection state={state} set={onChange} />;
      case 'connection': return <ConnectionSection state={state} set={onChange} />;
      case 'endpoints': return <EndpointsSection state={state} set={onChange} />;
      case 'semantics': return <SemanticsSection state={state} set={onChange} />;
      case 'onchain': return <OnChainSection state={state} set={onChange} />;
      case 'advanced': return <AdvancedSection state={state} set={onChange} />;
      default: return null;
    }
  };

  const handleNext = () => {
    if (isLast) {
      onNext();
    } else {
      const nextId = SECTIONS[secIdx + 1].id;
      handleSectionChange(nextId);
    }
  };

  return (
    <div className="wizard-layout">
      {/* Left sidebar */}
      <aside className="wizard-sidebar">
        <div className="wizard-sidebar-label">SECTIONS</div>

        {SECTIONS.map((s, i) => {
          const filled = visited.has(s.id) && s.requiredFilled(state);
          const active = s.id === activeSection;
          return (
            <button key={s.id} type="button" className={`wizard-section-btn ${active ? 'wizard-section-active' : ''}`} onClick={() => handleSectionChange(s.id)}>
              <div className={`wizard-section-num ${filled ? 'wizard-section-num-done' : ''}`}>
                {filled ? (
                  <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : i + 1}
              </div>
              <div className="wizard-section-btn-inner">
                {s.icon}
                <span>{s.label}</span>
              </div>
              {active && <div className="wizard-section-active-bar" />}
            </button>
          );
        })}

        <div className="wizard-sidebar-progress">
          <div className="wizard-sidebar-progress-label">
            <span>COMPLETENESS</span>
            <span>{completedCount}/{SECTIONS.length}</span>
          </div>
          <div className="wizard-progress-track">
            <div className="wizard-progress-fill" style={{ width: `${(completedCount / SECTIONS.length) * 100}%` }} />
          </div>
        </div>
      </aside>

      {/* Center form */}
      <main className="wizard-form-panel">
        <div className="wizard-form-header">
          <div className="wizard-section-eyebrow">SECTION {secIdx + 1} OF {SECTIONS.length}</div>
          <h2 className="wizard-form-title">{sec.label}</h2>
        </div>

        <div className="wizard-form-scrollable">
          {renderSection()}
        </div>

        <div className="wizard-form-footer">
          {secIdx > 0 && (
            <button type="button" className="btn-ghost" onClick={() => setActiveSection(SECTIONS[secIdx - 1].id)}>
              ← Back
            </button>
          )}
          <div style={{ display: 'flex', gap: 12, marginLeft: 'auto' }}>
            {isLast ? (
              allBasicsOk ? (
                <>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      const blob = new Blob([yaml], { type: 'text/yaml' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${state.slug || 'integration'}.yaml`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download YAML
                  </button>
                  <button type="button" className="btn-fill" onClick={onNext}>
                    Proceed to Upload →
                  </button>
                </>
              ) : (
                <div className="wizard-missing-wrap">
                  <button type="button" className="btn-fill btn-disabled" disabled>
                    Fill Required Fields First
                  </button>
                  {missingFields.length > 0 && (
                    <div className="wizard-missing-list">
                      <span className="wizard-missing-title">Missing:</span>
                      {missingFields.map(f => (
                        <button
                          key={f}
                          type="button"
                          className="wizard-missing-item"
                          onClick={() => handleSectionChange(f.includes('Basics') ? 'basics' : 'connection')}
                        >
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                          </svg>
                          {f}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            ) : (
              <button type="button" className="btn-fill" onClick={handleNext}>
                {`Next: ${SECTIONS[secIdx + 1]?.label} →`}
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Right YAML preview */}
      <YamlPreview yaml={yaml} />
    </div>
  );
}
