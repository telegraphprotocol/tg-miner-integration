'use client';

import { useEffect, useState } from 'react';
import { useSession } from '../hooks/useSession';
import { useToast } from './Toast';
import Spinner from './Spinner';

function DiscordIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.099.246.198.373.292a.077.077 0 0 1-.006.128 12.3 12.3 0 0 1-1.873.891.076.076 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.029 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.211 0 2.176 1.096 2.157 2.42 0 1.333-.955 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.211 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

function NameCard() {
  const toast = useToast();
  const { user, refetch } = useSession();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [busy, setBusy] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName ?? '');
    setLastName(user.lastName ?? '');
  }, [user]);

  if (!user) return null;

  const handleSave = async () => {
    setShowConfirm(false);
    setBusy(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Could not save name.'); return; }
      toast.success('Name saved — it\'s now locked.');
      refetch();
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (user.profileLocked) {
    return (
      <div className="register-card register-card-full">
        <div className="register-card-header"><span>Name</span></div>
        <p className="profile-name-value">
          {[user.firstName, user.lastName].filter(Boolean).join(' ') || <span style={{ opacity: 0.5 }}>Not set</span>}
        </p>
      </div>
    );
  }

  return (
    <div className="register-card register-card-full">
      <div className="register-card-header"><span>Name</span></div>
      <p className="field-hint" style={{ marginBottom: 16 }}>
        You can only set this once — double-check before saving, it can't be changed afterward.
      </p>

      <div className="field-row-2">
        <div className="field-group">
          <label className="field-label">First Name</label>
          <input
            className="field-input"
            type="text"
            placeholder="Ada"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            maxLength={60}
            disabled={busy}
          />
        </div>
        <div className="field-group">
          <label className="field-label">Last Name</label>
          <input
            className="field-input"
            type="text"
            placeholder="Lovelace"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            maxLength={60}
            disabled={busy}
          />
        </div>
      </div>

      <button
        type="button"
        className={`btn-fill ${busy ? 'btn-loading' : ''}`}
        style={{ marginTop: 16 }}
        onClick={() => setShowConfirm(true)}
        disabled={busy}
      >
        {busy ? <><Spinner /> Saving…</> : 'Save Name'}
      </button>

      {showConfirm && (
        <div className="modal-bd" onClick={e => e.target === e.currentTarget && setShowConfirm(false)}>
          <div className="modal-panel modal-auth">
            <div className="modal-header">
              <div className="modal-header-left">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>Confirm Your Name</span>
              </div>
              <button type="button" className="modal-close" onClick={() => setShowConfirm(false)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <p className="field-hint" style={{ marginBottom: 16 }}>
              Your name cannot be changed once saved. Please review before confirming.
            </p>

            <div className="wallet-info" style={{ marginBottom: 20 }}>
              <div className="wallet-info-row">
                <span className="result-row-label">NAME</span>
                <span className="result-row-value">
                  {[firstName, lastName].filter(Boolean).join(' ') || <span style={{ opacity: 0.5 }}>Not set</span>}
                </span>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-ghost" onClick={() => setShowConfirm(false)}>Go Back</button>
              <button type="button" className="btn-fill" onClick={handleSave}>Confirm & Lock</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SocialHandlesCard() {
  const toast = useToast();
  const { user, refetch } = useSession();
  const [discordUsername, setDiscordUsername] = useState('');
  const [xUsername, setXUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  const hasSavedHandles = !!(user?.discordUsername || user?.xUsername);

  useEffect(() => {
    if (!user) return;
    setDiscordUsername(user.discordUsername ?? '');
    setXUsername(user.xUsername ?? '');
    // Start in view mode once handles exist; edit mode by default for a first-time save.
    setEditing(!(user.discordUsername || user.xUsername));
  }, [user]);

  if (!user) return null;

  const handleSave = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discordUsername, xUsername }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Could not save social handles.'); return; }
      toast.success('Social handles saved.');
      setEditing(false);
      refetch();
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = () => {
    setDiscordUsername(user.discordUsername ?? '');
    setXUsername(user.xUsername ?? '');
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="register-card register-card-full">
        <div className="register-card-header">
          <span>Social Handles</span>
          <button type="button" className="btn-ghost" style={{ marginLeft: 'auto' }} onClick={() => setEditing(true)}>
            Edit
          </button>
        </div>
        <div className="wallet-info">
          <div className="wallet-info-row">
            <span className="result-row-label social-row-label"><DiscordIcon /> DISCORD</span>
            <span className="result-row-value result-mono">
              {user.discordUsername || <span style={{ opacity: 0.5 }}>Not set</span>}
            </span>
          </div>
          <div className="wallet-info-row">
            <span className="result-row-label social-row-label"><XIcon /> X</span>
            <span className="result-row-value result-mono">
              {user.xUsername || <span style={{ opacity: 0.5 }}>Not set</span>}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="register-card register-card-full">
      <div className="register-card-header"><span>Social Handles</span></div>
      <p className="field-hint" style={{ marginBottom: 16 }}>
        Optional — Discord and X usernames can be added or changed anytime.
      </p>

      <div className="field-row-2">
        <div className="field-group">
          <label className="field-label social-field-label"><DiscordIcon /> Discord Username</label>
          <input
            className="field-input field-mono"
            type="text"
            placeholder="username"
            value={discordUsername}
            onChange={e => setDiscordUsername(e.target.value)}
            maxLength={60}
            disabled={busy}
          />
        </div>
        <div className="field-group">
          <label className="field-label social-field-label"><XIcon /> X Username</label>
          <input
            className="field-input field-mono"
            type="text"
            placeholder="username"
            value={xUsername}
            onChange={e => setXUsername(e.target.value)}
            maxLength={60}
            disabled={busy}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button
          type="button"
          className={`btn-fill ${busy ? 'btn-loading' : ''}`}
          onClick={handleSave}
          disabled={busy}
        >
          {busy ? <><Spinner /> Saving…</> : 'Save Social Handles'}
        </button>
        {hasSavedHandles && (
          <button type="button" className="btn-ghost" onClick={handleCancel} disabled={busy}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

export default function ProfileDetailsCard() {
  return (
    <>
      <NameCard />
      <SocialHandlesCard />
    </>
  );
}
