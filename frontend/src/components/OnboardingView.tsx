import { useState, useCallback, useRef, useEffect } from 'react';
import { useResumeUpload } from '../hooks/useResumeUpload';
import { useResumes } from '../hooks/useResumes';
import { ProfileDataPanel } from './ProfileDataPanel';
import { RateLimitBanner } from './UsageMeter';
import type { UploadedProfile } from '../types';
import type { RateLimitError } from '../api/client';

const SAMPLE_PREFERENCES = `# Job Preferences

## Roles I'm Targeting

- Senior Software Engineer (Backend)
- Staff Software Engineer
- Backend Platform Engineer
- Senior Backend Engineer

## Preferred Company Sizes

- Series B startups and above
- Mid-size tech companies (100–2000 employees)
- Large tech companies

## Work Mode

- Remote (Worldwide)
- On-site only with visa sponsorship and relocation support

## Preferred Countries / Regions

- Remote (Worldwide)
- United States (Visa sponsorship + relocation required)
- Canada (Visa sponsorship + relocation required)
- United Kingdom (Visa sponsorship + relocation required)
- Germany (Visa sponsorship + relocation required)

## Salary

- **Minimum:** $120,000 USD/year
- **Target:** $150,000 USD/year
- **Open to equity:** Yes
- **Open to contract / freelance:** No

## Culture Preferences

- Strong engineering culture
- Code review culture
- Investment in developer tooling
- Clear growth path
- Async-friendly communication

## Deal Breakers

- On-site roles without visa sponsorship
- Unpaid overtime culture
- Legacy technology stacks with no modernization plan
`;

interface OnboardingViewProps {
  onComplete: (profile: UploadedProfile, tab?: 'find-jobs' | 'analyze-job') => void;
  onUsageUpdate?: (used: number, limit: number, remaining: number, resets: number) => void;
}

type DropTarget = 'resume' | 'prefs';

const STAGE_LABELS: Record<string, { label: string; icon: string }> = {
  uploading: { label: 'Uploading your resume…', icon: '📤' },
  parsing:   { label: 'Extracting skills & experience…', icon: '🧠' },
  done:      { label: 'Profile built!', icon: '✅' },
};

export function OnboardingView({ onComplete }: OnboardingViewProps) {
  const { stage, uploadedProfile, error, upload, reset } = useResumeUpload();

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [prefsFile, setPrefsFile] = useState<File | null>(null);
  const [showSample, setShowSample] = useState(false);
  const [sampleCopied, setSampleCopied] = useState(false);
  const [dragging, setDragging] = useState<DropTarget | null>(null);
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [rateLimitErr, setRateLimitErr] = useState<RateLimitError | null>(null);
  const [showPreviousResumes, setShowPreviousResumes] = useState(false);
  // Retained for the optional profile review UI; saved resumes now enter directly.
  const [previewProfile, setPreviewProfile] = useState<UploadedProfile | null>(null);

  const resumeInputRef = useRef<HTMLInputElement>(null);
  const prefsInputRef = useRef<HTMLInputElement>(null);

  // Previous resumes
  const {
    resumes,
    loading: resumesLoading,
    activating,
    error: resumesError,
    fetchResumes,
    activate,
  } = useResumes();

  useEffect(() => {
    fetchResumes();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hasPreviousResumes = resumes.length > 0;

  /** Activate a previous resume and enter the app without reprocessing it. */
  const handleActivatePrevious = async (resumeId: string) => {
    await activate(resumeId, (profile) => onComplete(profile, 'find-jobs'));
  };

  // ── Upload trigger ──────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!resumeFile) return;
    try {
      await upload(resumeFile, prefsFile ?? undefined);
    } catch (err: unknown) {
      // RateLimitError is caught in useResumeUpload and surfaced via error state.
      // We also separately detect it here to show the modal banner.
      const e = err as { name?: string; used?: number; limit?: number; resetsInMinutes?: number };
      if (e?.name === 'RateLimitError') {
        setRateLimitErr(e as unknown as RateLimitError);
      }
    }
  };

  // When upload completes, show the profile panel before transitioning
  if (stage === 'done' && uploadedProfile && !showProfilePanel) {
    setTimeout(() => setShowProfilePanel(true), 500);
  }

  // ── Drag-and-drop helpers ────────────────────────────────────────────────
  const handleDrop = useCallback(
    (target: DropTarget) => (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(null);
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      if (target === 'resume') setResumeFile(file);
      else setPrefsFile(file);
    },
    []
  );

  const handleDragOver = (target: DropTarget) => (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(target);
  };

  const handleDragLeave = () => setDragging(null);

  // ── Sample copy/download ─────────────────────────────────────────────────
  const handleCopySample = async () => {
    await navigator.clipboard.writeText(SAMPLE_PREFERENCES);
    setSampleCopied(true);
    setTimeout(() => setSampleCopied(false), 2500);
  };

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_PREFERENCES], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'preference.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const isLoading = stage === 'uploading' || stage === 'parsing' || (stage === 'done' && !showProfilePanel);

  // ── Render: rate limit banner ────────────────────────────────────────────
  if (rateLimitErr) {
    return (
      <RateLimitBanner
        usage={{
          used: rateLimitErr.used,
          limit: rateLimitErr.limit,
          remaining: 0,
          resets_in_minutes: rateLimitErr.resetsInMinutes,
        }}
        onDismiss={() => { setRateLimitErr(null); reset(); }}
      />
    );
  }

  // ── Render: profile data panel (after successful upload) ─────────────────
  if (showProfilePanel && uploadedProfile) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              Profile Ready
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Here's what we found</h1>
            <p className="text-slate-500 text-sm">Review your extracted profile before we find your matches.</p>
          </div>

          <ProfileDataPanel profile={uploadedProfile} compact />

          <button
            id="continue-to-app-btn"
            onClick={() => onComplete(uploadedProfile)}
            className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500
                       text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-indigo-600/25
                       hover:scale-[1.01] active:scale-[0.99]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            Continue to Job Matching
          </button>
        </div>
      </div>
    );
  }

  // ── Render: loading state ─────────────────────────────────────────────────
  if (isLoading) {
    const current = STAGE_LABELS[stage] ?? STAGE_LABELS.uploading;
    const steps = ['uploading', 'parsing', 'done'] as const;
    const currentIdx = steps.indexOf(stage as typeof steps[number]);

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center space-y-8">
          {/* Animated ring */}
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20" />
            <div className="absolute inset-0 rounded-full border-4 border-t-indigo-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
            <div className="absolute inset-3 rounded-full bg-indigo-600/20 flex items-center justify-center text-3xl">
              {current.icon}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xl font-semibold text-white">{current.label}</p>
            <p className="text-sm text-slate-400">This usually takes 10–20 seconds</p>
          </div>

          {/* Step progress */}
          <div className="flex items-center justify-center gap-3">
            {steps.map((step, i) => (
              <div key={step} className="flex items-center gap-3">
                <div
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
                    i < currentIdx
                      ? 'bg-indigo-400 scale-100'
                      : i === currentIdx
                      ? 'bg-indigo-400 scale-125 ring-4 ring-indigo-400/25'
                      : 'bg-slate-700'
                  }`}
                />
                {i < steps.length - 1 && (
                  <div
                    className={`w-12 h-0.5 transition-all duration-700 ${
                      i < currentIdx ? 'bg-indigo-400' : 'bg-slate-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
            {steps.map((step, i) => (
              <span
                key={step}
                className={`transition-colors duration-300 ${
                  i <= currentIdx ? 'text-slate-300' : 'text-slate-600'
                }`}
                style={{ minWidth: 80, textAlign: 'center' }}
              >
                {step === 'uploading' ? 'Uploading' : step === 'parsing' ? 'Parsing' : 'Profile Ready'}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Render: resume preview / compare screen ────────────────────────────────
  if (previewProfile) {
    const skills = previewProfile.skills_summary ?? [];
    const roles = previewProfile.roles ?? [];
    const exp = previewProfile.experience_entries ?? [];
    const name = previewProfile.name ?? 'Your Profile';
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col">
        {/* Header */}
        <header className="px-6 py-5 flex items-center gap-3 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-base font-bold text-white">JobSense</span>
          <span className="ml-1 text-xs font-medium px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Beta</span>
        </header>

        <main className="flex-1 flex items-start justify-center px-4 py-8 overflow-y-auto">
          <div className="w-full max-w-3xl space-y-6">

            {/* Back button */}
            <button
              onClick={() => setPreviewProfile(null)}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Choose a different resume
            </button>

            {/* Profile card */}
            <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">

              {/* Card header */}
              <div className="px-6 py-5 border-b border-slate-700/50 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-lg font-bold text-white shadow-lg shadow-indigo-900/50 flex-shrink-0">
                  {name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-white truncate">{name}</h2>
                  {roles.length > 0 && (
                    <p className="text-sm text-indigo-300 truncate mt-0.5">{roles.slice(0, 3).join(' · ')}</p>
                  )}
                </div>
                <div className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30">
                  <svg className="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                  </svg>
                  <span className="text-[10px] font-semibold text-blue-400">Loaded from DB</span>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 divide-x divide-slate-700/50 border-b border-slate-700/50">
                {[
                  { label: 'Skills', value: skills.length },
                  { label: 'Experience', value: exp.length + (exp.length === 1 ? ' role' : ' roles') },
                  { label: 'Education', value: previewProfile.education_count + ' entries' },
                ].map(({ label, value }) => (
                  <div key={label} className="px-5 py-4 text-center">
                    <p className="text-xl font-bold text-white">{value}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Skills preview */}
              {skills.length > 0 && (
                <div className="px-6 py-5 border-b border-slate-700/50">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {skills.slice(0, 18).map((s) => (
                      <span key={s} className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300 font-medium">{s}</span>
                    ))}
                    {skills.length > 18 && (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs text-slate-500">+{skills.length - 18} more</span>
                    )}
                  </div>
                </div>
              )}

              {/* Experience preview */}
              {exp.length > 0 && (
                <div className="px-6 py-5">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Experience</p>
                  <div className="space-y-3">
                    {exp.slice(0, 3).map((e, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-200">{e.title}</p>
                          <p className="text-xs text-slate-400">{e.company}{e.period ? ` · ${e.period}` : ''}</p>
                        </div>
                      </div>
                    ))}
                    {exp.length > 3 && (
                      <p className="text-xs text-slate-500 pl-10">+{exp.length - 3} more roles</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── What would you like to do? ── */}
            <div>
              <p className="text-sm font-semibold text-slate-300 mb-3 px-1">What would you like to do with this resume?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                {/* Find Matching Jobs */}
                <button
                  id="preview-find-jobs-btn"
                  onClick={() => onComplete(previewProfile, 'find-jobs')}
                  className="group flex items-start gap-4 p-5 rounded-2xl border border-slate-700/60 bg-slate-900/60
                             hover:border-indigo-500/60 hover:bg-indigo-500/5 transition-all duration-200 text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-600/30 transition-colors">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Find Matching Jobs</p>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">Search job listings personalized to your skills, experience, and preferences.</p>
                  </div>
                </button>

                {/* Analyze a Job */}
                <button
                  id="preview-analyze-job-btn"
                  onClick={() => onComplete(previewProfile, 'analyze-job')}
                  className="group flex items-start gap-4 p-5 rounded-2xl border border-slate-700/60 bg-slate-900/60
                             hover:border-violet-500/60 hover:bg-violet-500/5 transition-all duration-200 text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-600/30 transition-colors">
                    <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Analyze a Specific Job</p>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">Paste a job description to get a fit score, missing skills, and resume suggestions.</p>
                  </div>
                </button>

              </div>
            </div>

            {/* Secondary: upload a different resume */}
            <div className="text-center">
              <button
                onClick={() => setPreviewProfile(null)}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors underline underline-offset-2"
              >
                Upload a different resume instead
              </button>
            </div>

          </div>
        </main>
      </div>
    );
  }

  // ── Render: main onboarding UI ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 flex items-center gap-3 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <span className="text-base font-bold text-white">JobSense</span>
          <span className="ml-2 text-xs font-medium px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            Beta
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl space-y-8">

          {/* Hero */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Powered by Gemini AI
            </div>
            <h1 className="text-4xl font-bold text-white leading-tight">
              Your resume.<br />
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                Your personalized job matches.
              </span>
            </h1>
            <p className="text-slate-400 text-lg max-w-lg mx-auto leading-relaxed">
              Upload your resume and we'll extract your skills, experience, and profile to find your best-fit opportunities.
            </p>
          </div>

          {/* ── Previous Resumes shortcut ───────────────────────────────────── */}
          {hasPreviousResumes && (
            <div className="bg-slate-900/40 border border-slate-700/40 rounded-2xl overflow-hidden">
              <button
                id="toggle-previous-resumes"
                onClick={() => setShowPreviousResumes((s) => !s)}
                className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-semibold text-slate-200">Use a previous resume</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                    {resumes.length} saved
                  </span>
                </div>
                <svg
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showPreviousResumes ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showPreviousResumes && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-700/40 space-y-2">
                  {resumesLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <span className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin" />
                    </div>
                  ) : (
                    resumes.map((resume) => {
                      const isActivating = activating === resume.resume_id;
                      return (
                        <button
                          key={resume.resume_id}
                          id={`prev-resume-${resume.resume_id}`}
                          disabled={!!activating}
                          onClick={() => handleActivatePrevious(resume.resume_id)}
                          aria-label={`Open ${resume.name || resume.filename || 'saved resume'}`}
                          className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl
                            border transition-all duration-150 text-left
                            ${
                              resume.is_active
                                ? 'border-indigo-500/50 bg-indigo-500/10'
                                : 'border-slate-700/50 bg-slate-800/40 hover:border-indigo-500/40 hover:bg-indigo-500/5'
                            }
                            ${activating && !isActivating ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                          `}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-200 truncate">
                              {resume.name || resume.filename || 'Resume'}
                            </p>
                            {resume.roles.length > 0 && (
                              <p className="text-xs text-slate-400 truncate mt-0.5">{resume.roles.join(' · ')}</p>
                            )}
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {resume.skills_count} skills · {resume.experience_count} exp
                              {resume.created_at && (
                                <> · {new Date(resume.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                              )}
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            {isActivating ? (
                              <span className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin block" />
                            ) : (
                              <span className={`text-xs font-semibold ${
                                resume.is_active ? 'text-indigo-400' : 'text-slate-500'
                              }`}>
                                {resume.is_active ? 'Open' : 'Use'}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                  {resumesError && (
                    <p className="text-xs text-red-400 text-center pt-1">{resumesError}</p>
                  )}
                  <p className="text-[11px] text-slate-500 text-center pt-1">
                    💾 Loads from database — no LLM call
                  </p>
                </div>
              )}
            </div>
          )}

          {/* divider */}
          {hasPreviousResumes && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-700/50" />
              <span className="text-xs text-slate-500 font-medium">or upload a new resume</span>
              <div className="flex-1 h-px bg-slate-700/50" />
            </div>
          )}
          <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 space-y-5">

            {/* ── Resume drop zone (primary) ── */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">Resume</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">Required</span>
              </div>
              <div
                id="resume-drop-zone"
                onClick={() => resumeInputRef.current?.click()}
                onDrop={handleDrop('resume')}
                onDragOver={handleDragOver('resume')}
                onDragLeave={handleDragLeave}
                className={`
                  relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center
                  transition-all duration-200 group
                  ${dragging === 'resume'
                    ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]'
                    : resumeFile
                    ? 'border-emerald-500/60 bg-emerald-500/5'
                    : 'border-slate-600 hover:border-indigo-500/60 hover:bg-indigo-500/5'
                  }
                `}
              >
                <input
                  ref={resumeInputRef}
                  id="resume-file-input"
                  type="file"
                  accept=".pdf,.txt,.md"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && setResumeFile(e.target.files[0])}
                />

                {resumeFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-emerald-300">{resumeFile.name}</p>
                      <p className="text-xs text-slate-400">{(resumeFile.size / 1024).toFixed(1)} KB · Click to change</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto group-hover:border-indigo-500/50 group-hover:bg-indigo-500/10 transition-colors">
                      <svg className="w-6 h-6 text-slate-400 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">Drop your resume here or <span className="text-indigo-400">browse</span></p>
                      <p className="text-xs text-slate-500 mt-1">PDF, TXT · Max 10 MB</p>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500">
                We'll extract your skills, experience, roles, and education from your resume.
              </p>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-700/60" />
              <span className="text-xs text-slate-500 font-medium">Optional</span>
              <div className="flex-1 h-px bg-slate-700/60" />
            </div>

            {/* ── Preferences drop zone (optional) ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">preference.md</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-400 border border-slate-600 font-medium">Optional</span>
                </div>
                <button
                  id="view-sample-prefs-btn"
                  onClick={() => setShowSample((s) => !s)}
                  className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {showSample ? 'Hide Sample' : 'View Sample'}
                </button>
              </div>

              {/* Sample preference.md panel */}
              {showSample && (
                <div className="rounded-xl border border-slate-700 bg-slate-900 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/60 border-b border-slate-700">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                      </div>
                      <span className="text-xs text-slate-400 font-mono">preference.md</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        id="download-sample-prefs-btn"
                        onClick={handleDownloadSample}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </button>
                      <button
                        id="copy-sample-prefs-btn"
                        onClick={handleCopySample}
                        className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                      >
                        {sampleCopied ? (
                          <>
                            <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <pre className="text-xs text-slate-300 p-4 overflow-x-auto leading-relaxed font-mono max-h-56 overflow-y-auto">
                    {SAMPLE_PREFERENCES.trim()}
                  </pre>
                  <div className="px-4 py-2.5 bg-slate-800/40 border-t border-slate-700 text-xs text-slate-400">
                    💡 Copy this, customize with your preferences, save as <code className="text-slate-300 font-mono">preference.md</code>, and upload it below.
                  </div>
                </div>
              )}

              {/* Prefs drop zone */}
              <div
                id="prefs-drop-zone"
                onClick={() => prefsInputRef.current?.click()}
                onDrop={handleDrop('prefs')}
                onDragOver={handleDragOver('prefs')}
                onDragLeave={handleDragLeave}
                className={`
                  cursor-pointer rounded-xl border border-dashed p-4 text-center
                  transition-all duration-200 group
                  ${dragging === 'prefs'
                    ? 'border-indigo-400 bg-indigo-500/10'
                    : prefsFile
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/40'
                  }
                `}
              >
                <input
                  ref={prefsInputRef}
                  id="prefs-file-input"
                  type="file"
                  accept=".md,.txt"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && setPrefsFile(e.target.files[0])}
                />

                {prefsFile ? (
                  <div className="flex items-center justify-center gap-2.5">
                    <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-left">
                      <p className="text-xs font-medium text-emerald-300">{prefsFile.name}</p>
                      <p className="text-xs text-slate-500">Click to change</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-slate-500 group-hover:text-slate-400 transition-colors">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-xs">Drop preference.md here or browse</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Personalizes job listings with your target roles, location, salary, and culture preferences.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div id="upload-error" className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30">
                <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-xs font-semibold text-red-300">Upload failed</p>
                  <p className="text-xs text-red-400/80 mt-0.5">{error}</p>
                </div>
                <button onClick={reset} className="ml-auto text-xs text-red-400 hover:text-red-300 font-medium">
                  Retry
                </button>
              </div>
            )}

            {/* CTA */}
            <button
              id="upload-resume-cta"
              onClick={handleUpload}
              disabled={!resumeFile || isLoading}
              className={`
                w-full flex items-center justify-center gap-2.5
                px-5 py-3.5 rounded-xl font-semibold text-sm
                transition-all duration-200
                ${resumeFile && !isLoading
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 hover:shadow-indigo-500/30 hover:scale-[1.01] active:scale-[0.99]'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }
              `}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload Resume & Get Started
              {prefsFile && (
                <span className="text-indigo-300/80 text-xs font-normal">+ preferences</span>
              )}
            </button>
          </div>

          {/* How it works */}
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { icon: '📄', title: 'Upload Resume', desc: 'PDF or plain text' },
              { icon: '🧠', title: 'AI Extracts Profile', desc: 'Skills, experience & roles' },
              { icon: '🎯', title: 'Get Matched', desc: 'Personalized job listings' },
            ].map((item) => (
              <div key={item.title} className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
                <div className="text-2xl mb-2">{item.icon}</div>
                <p className="text-xs font-semibold text-slate-200">{item.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
