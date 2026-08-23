import { useState, useCallback } from 'react';
import { uploadResume } from '../api/client';
import type { UploadedProfile } from '../types';

export type UploadStage = 'idle' | 'uploading' | 'parsing' | 'done' | 'error';

interface UseResumeUploadReturn {
  stage: UploadStage;
  uploadedProfile: UploadedProfile | null;
  error: string | null;
  upload: (resumeFile: File, prefsFile?: File) => Promise<void>;
  reset: () => void;
}

/**
 * Manages the full resume-upload lifecycle:
 *   idle → uploading → parsing → done (or error)
 *
 * The "uploading" and "parsing" stages are both part of the single POST /api/upload call,
 * but we simulate them as separate stages for a richer UX progress indicator.
 */
export function useResumeUpload(): UseResumeUploadReturn {
  const [stage, setStage] = useState<UploadStage>('idle');
  const [uploadedProfile, setUploadedProfile] = useState<UploadedProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (resumeFile: File, prefsFile?: File) => {
    setStage('uploading');
    setError(null);
    setUploadedProfile(null);

    try {
      // Brief delay so the user can see "Uploading…" before we move to "Parsing…"
      await new Promise((res) => setTimeout(res, 600));
      setStage('parsing');

      const profile = await uploadResume(resumeFile, prefsFile);

      setUploadedProfile(profile);
      setStage('done');
    } catch (err: unknown) {
      const message =
        (err as { detail?: string })?.detail ??
        (err instanceof Error ? err.message : 'Upload failed. Please try again.');
      setError(message);
      setStage('error');
    }
  }, []);

  const reset = useCallback(() => {
    setStage('idle');
    setUploadedProfile(null);
    setError(null);
  }, []);

  return { stage, uploadedProfile, error, upload, reset };
}
