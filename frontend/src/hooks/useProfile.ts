import { useState, useEffect } from 'react';
import { getProfileInfo } from '../api/client';
import type { ProfileInfo } from '../types';

/**
 * Fetches and caches the user's personal info (name, email, etc.) once per session.
 * Used to populate the PDF resume header.
 */
export function useProfile() {
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getProfileInfo()
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.detail ?? 'Failed to load profile info');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { profile, loading, error };
}
