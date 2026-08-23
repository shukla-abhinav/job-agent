import { useEffect } from 'react';
import { useResumes } from '../hooks/useResumes';
import type { UploadedProfile } from '../types';

interface MyResumesPanelProps {
  onProfileActivated: (profile: UploadedProfile) => void;
}

function formatDate(iso: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export function MyResumesPanel({ onProfileActivated }: MyResumesPanelProps) {
  const { resumes, loading, activating, error, fetchResumes, activate } = useResumes();

  useEffect(() => {
    fetchResumes();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="animate-pulse bg-slate-100 rounded-xl h-16" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-xs text-red-500 px-1">{error}</p>
    );
  }

  if (resumes.length === 0) {
    return (
      <p className="text-xs text-slate-400 px-1 italic">No previous resumes found.</p>
    );
  }

  return (
    <div id="my-resumes-panel" className="space-y-2">
      {resumes.map((resume) => {
        const isActivating = activating === resume.resume_id;

        return (
          <button
            key={resume.resume_id}
            id={`resume-select-${resume.resume_id}`}
            onClick={() => activate(resume.resume_id, onProfileActivated)}
            disabled={!!activating}
            className={`w-full text-left rounded-xl border px-3 py-2.5 transition-all duration-150
              ${resume.is_active
                ? 'border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }
              ${activating && !isActivating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                {/* Name */}
                <p className={`text-xs font-semibold truncate ${resume.is_active ? 'text-indigo-800' : 'text-slate-800'}`}>
                  {resume.name || resume.filename || 'Resume'}
                </p>

                {/* Roles */}
                {resume.roles.length > 0 && (
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">
                    {resume.roles.join(' · ')}
                  </p>
                )}

                {/* Meta row */}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400">
                    {resume.skills_count} skills · {resume.experience_count} exp
                  </span>
                  {resume.created_at && (
                    <span className="text-[10px] text-slate-400">
                      Uploaded {formatDate(resume.created_at)}
                    </span>
                  )}
                </div>
              </div>

              {/* Status indicator */}
              <div className="flex-shrink-0 mt-0.5">
                {isActivating ? (
                  <span className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin block" />
                ) : resume.is_active ? (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-indigo-600">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Active
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-300 group-hover:text-slate-400">Select</span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
