import { useState, useCallback } from 'react';
import { getResumes, activateResume } from '../api/client';
import type { ResumeHistoryItem, UploadedProfile } from '../types';

interface UseResumesReturn {
  resumes: ResumeHistoryItem[];
  loading: boolean;
  activating: string | null;   // resume_id currently being activated
  error: string | null;
  fetchResumes: () => Promise<void>;
  activate: (resumeId: string, onProfile: (p: UploadedProfile) => void) => Promise<void>;
}

export function useResumes(onProfileLoaded?: (name: string) => void): UseResumesReturn {
  const [resumes, setResumes] = useState<ResumeHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchResumes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getResumes();
      setResumes(data);
    } catch {
      setError('Could not load resume history');
    } finally {
      setLoading(false);
    }
  }, []);

  const activate = useCallback(async (resumeId: string, onProfile: (p: UploadedProfile) => void) => {
    setActivating(resumeId);
    setError(null);
    try {
      await activateResume(resumeId);

      // Build a minimal UploadedProfile from the cached ResumeHistoryItem data.
      // The full profile will be loaded by the app via /api/session/status on next refresh;
      // for immediate UI update, we trigger a session reload here.
      const { getSessionStatus } = await import('../api/client');
      const status = await getSessionStatus();
      if (status.has_profile && status.profile_data) {
        onProfile(status.profile_data);
        onProfileLoaded?.(status.profile_data.name);
      }

      // Mark activated in the list
      setResumes((prev) =>
        prev.map((r) => ({ ...r, is_active: r.resume_id === resumeId }))
      );
    } catch (err: unknown) {
      const e = err as { detail?: string };
      setError(e?.detail ?? 'Failed to activate resume');
    } finally {
      setActivating(null);
    }
  }, [onProfileLoaded]);

  return { resumes, loading, activating, error, fetchResumes, activate };
}
