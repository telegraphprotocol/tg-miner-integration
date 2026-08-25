'use client';

import { useEffect, useState } from 'react';
import { useSession } from '../hooks/useSession';
import { useToast } from './Toast';
import Spinner from './Spinner';
import CountrySelect from './CountrySelect';
import { useGeoCountryGuess } from '../hooks/useGeoCountryGuess';

/**
 * Blocking, non-dismissable modal shown to any signed-in user missing a
 * country — mandatory to use the app, for new and pre-existing accounts alike.
 */
export default function RequiredProfileModal() {
  const toast = useToast();
  const { user, refetch } = useSession();

  const [country, setCountry] = useState('');
  const [countryBusy, setCountryBusy] = useState(false);
  const [countryError, setCountryError] = useState('');

  const geoGuess = useGeoCountryGuess();
  useEffect(() => {
    if (geoGuess && !country) setCountry(geoGuess);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoGuess]);

  if (!user) return null;
  const needsCountry = !user.country;
  if (!needsCountry) return null;

  const handleSaveCountry = async () => {
    setCountryError('');
    if (!country) { setCountryError('Select your country.'); return; }
    setCountryBusy(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country }),
      });
      const data = await res.json();
      if (!res.ok) { setCountryError(data.error || 'Could not save country.'); return; }
      toast.success('Country saved.');
      refetch();
    } catch {
      setCountryError('Network error. Please try again.');
    } finally {
      setCountryBusy(false);
    }
  };

  return (
    <div className="modal-bd">
      <div className="modal-panel modal-auth">
        <div className="modal-header">
          <div className="modal-header-left">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>Complete your profile</span>
          </div>
        </div>

        <p className="required-profile-banner">
          This is mandatory to continue — you must complete this before using the app.
        </p>

        <div className="field-group">
          <label className="field-label">Country <span className="field-required">*</span></label>
          <CountrySelect value={country} onChange={setCountry} />
          <p className="field-hint" style={{ marginTop: 4 }}>
            {geoGuess ? 'Auto-detected from your location — confirm or change it. ' : ''}
            Required — cannot be changed once set.
          </p>
          {countryError && <p className="field-error">{countryError}</p>}
          <button
            type="button"
            className={`btn-fill btn-full ${countryBusy ? 'btn-loading' : ''}`}
            onClick={handleSaveCountry}
            disabled={countryBusy}
            style={{ marginTop: 8 }}
          >
            {countryBusy ? <><Spinner /> Saving…</> : 'Save country'}
          </button>
        </div>
      </div>
    </div>
  );
}
