import { useState, useEffect, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { JobInputPanel } from './components/JobInputPanel';
import { AnalysisPanel } from './components/AnalysisPanel';
import { ResumePanel } from './components/ResumePanel';
import { JobDiscoveryView } from './components/JobDiscovery/JobDiscoveryView';
import { OnboardingView } from './components/OnboardingView';
import { AuthView } from './components/AuthView';
import { UsageMeter, RateLimitBanner } from './components/UsageMeter';
import { MyResumesPanel } from './components/MyResumesPanel';
import { ProfileDataPanel } from './components/ProfileDataPanel';
import { useJobAnalysis } from './hooks/useJobAnalysis';
import { useResumeGenerator } from './hooks/useResumeGenerator';
import { useAuth } from './hooks/useAuth';
import { useUsage } from './hooks/useUsage';
import { getSessionStatus, clearSession, RateLimitError } from './api/client';
import type { UploadedProfile } from './types';

type AppState = 'checking' | 'auth' | 'onboarding' | 'ready';
type Tab = 'find-jobs' | 'analyze-job';

const TAB_KEY = 'jsa_active_tab';

export default function App() {
  const [appState, setAppState] = useState<AppState>('checking');
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const saved = localStorage.getItem(TAB_KEY);
    return (saved === 'find-jobs' || saved === 'analyze-job') ? saved : 'find-jobs';
  });
  const [sessionProfile, setSessionProfile] = useState<UploadedProfile | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [rateLimitError, setRateLimitError] = useState<RateLimitError | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { currentUser, isAuthenticated, logout } = useAuth();
  const { usage, refresh: refreshUsage, applyUpdate } = useUsage();

  const { result: matchResult, loading: analyzing, error: matchError, analyze } = useJobAnalysis();
  const { result: resumeResult, loading: generating, error: resumeError, generate } = useResumeGenerator();

  // ── Persist tab ──────────────────────────────────────────────────────────────
  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
    localStorage.setItem(TAB_KEY, tab);
  }, []);

  // ── On mount: if authenticated, check session status ──────────────────────
  useEffect(() => {
    if (!isAuthenticated) {
      setAppState('auth');
      return;
    }

    getSessionStatus()
      .then((status) => {
        refreshUsage();
        if (status.has_profile && status.profile_data) {
          setSessionProfile(status.profile_data);
          setAppState('ready');
        } else {
          setAppState('onboarding');
        }
      })
      .catch((err) => {
        if (err?.name === 'AuthError') {
          logout();
          setAppState('auth');
        } else {
          setAppState('onboarding');
        }
      });
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auth complete ────────────────────────────────────────────────────────────
  const handleAuthenticated = useCallback(() => {
    setAppState('checking');
    getSessionStatus()
      .then((status) => {
        refreshUsage();
        if (status.has_profile && status.profile_data) {
          setSessionProfile(status.profile_data);
          setAppState('ready');
        } else {
          setAppState('onboarding');
        }
      })
      .catch(() => setAppState('onboarding'));
  }, [refreshUsage]);

  // ── Onboarding complete ───────────────────────────────────────────────────────
  const handleOnboardingComplete = useCallback((profile: UploadedProfile, tab?: 'find-jobs' | 'analyze-job') => {
    setSessionProfile(profile);
    setAppState('ready');
    if (tab) {
      setActiveTab(tab);
      localStorage.setItem(TAB_KEY, tab);
    }
    refreshUsage();
  }, [refreshUsage]);

  // ── Clear profile → back to onboarding ──────────────────────────────────────
  const handleClearProfile = useCallback(async () => {
    try {
      await clearSession();
    } catch { /* best effort */ }
    setSessionProfile(null);
    setJobDescription('');
    setAppState('onboarding');
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────────────
  const handleLogout = useCallback(() => {
    logout();
    setSessionProfile(null);
    setJobDescription('');
    setAppState('auth');
  }, [logout]);

  // ── Resume activated from history (DB, no LLM) ──────────────────────────────
  const handleProfileActivated = useCallback((profile: UploadedProfile) => {
    setSessionProfile(profile);
    refreshUsage();
    toast.success('Resume loaded from history');
  }, [refreshUsage]);

  // ── Rate-limit aware actions (analyze-job tab) ───────────────────────────────
  const withRateLimit = useCallback(
    async (fn: () => Promise<unknown>, successMsg: string, failMsg: string) => {
      const promise = fn();
      toast.promise(promise, {
        loading: successMsg.replace('!', '…'),
        success: successMsg,
        error: (err) => {
          if (err instanceof RateLimitError) {
            setRateLimitError(err);
            applyUpdate({ used: err.used, limit: err.limit, remaining: 0, resets_in_minutes: err.resetsInMinutes });
            return 'Rate limit reached';
          }
          return `${failMsg}: ${(err as { detail?: string })?.detail ?? (err as Error)?.message ?? 'Unknown error'}`;
        },
      });
      try {
        await promise;
      } catch {
        // handled by toast
      } finally {
        refreshUsage();
      }
    },
    [refreshUsage, applyUpdate]
  );

  const handleAnalyze = () => withRateLimit(() => analyze(jobDescription), 'Analysis complete!', 'Analysis failed');
  const handleGenerateResume = () => withRateLimit(() => generate(jobDescription), 'Resume generated!', 'Generation failed');

  const showResumePanel = resumeResult || generating || resumeError;

  // ── Loading screen ──────────────────────────────────────────────────────────
  if (appState === 'checking') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-4 border-indigo-500/30 border-t-indigo-400 animate-spin" />
          <p className="text-sm text-slate-400">Loading…</p>
        </div>
      </div>
    );
  }

  if (appState === 'auth') {
    return (
      <>
        <Toaster position="top-right" toastOptions={{ className: 'text-sm font-medium', duration: 4000 }} />
        <AuthView onAuthenticated={handleAuthenticated} />
      </>
    );
  }

  if (appState === 'onboarding') {
    return (
      <>
        <Toaster position="top-right" toastOptions={{ className: 'text-sm font-medium', duration: 4000 }} />
        <OnboardingView onComplete={handleOnboardingComplete} />
      </>
    );
  }

  // ── Main App ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-100 font-sans flex flex-col">
      <Toaster position="top-right" toastOptions={{ className: 'text-sm font-medium', duration: 4000 }} />

      {rateLimitError && (
        <RateLimitBanner
          usage={{ used: rateLimitError.used, limit: rateLimitError.limit, remaining: 0, resets_in_minutes: rateLimitError.resetsInMinutes }}
          onDismiss={() => setRateLimitError(null)}
        />
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <button
            onClick={() => setSidebarOpen((s) => !s)}
            className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/20 flex-shrink-0"
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="hidden sm:block">
            <span className="text-base font-bold text-slate-900">JobSense</span>
          </div>

          {/* Tabs */}
          <nav className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 ml-3" role="tablist">
            {([
              { id: 'find-jobs', label: 'Find Jobs', badge: 'AI' },
              { id: 'analyze-job', label: 'Analyze Job', badge: null },
            ] as { id: Tab; label: string; badge: string | null }[]).map((tab) => (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150
                  ${activeTab === tab.id
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
              >
                {tab.label}
                {tab.badge && (
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Right side: usage + user */}
          <div className="ml-auto flex items-center gap-3">
            {usage && <UsageMeter usage={usage} />}

            {/* User pill */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                <span className="text-[9px] font-bold text-white">
                  {currentUser?.email?.[0]?.toUpperCase() ?? '?'}
                </span>
              </div>
              <span className="text-xs font-medium text-slate-600 max-w-[140px] truncate">
                {currentUser?.email}
              </span>
            </div>

            {/* Logout */}
            <button
              id="logout-btn"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600
                         hover:bg-red-50 rounded-xl border border-transparent hover:border-red-100 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        {sidebarOpen && (
          <aside className="w-72 flex-shrink-0 bg-white border-r border-slate-200 overflow-y-auto flex flex-col">
            <div className="flex-1 p-4 space-y-5">

              {/* Upload new resume */}
              <div>
                <button
                  id="upload-new-resume-btn"
                  onClick={handleClearProfile}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl
                             border-2 border-dashed border-slate-300 text-slate-500 text-xs font-semibold
                             hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload New Resume
                </button>
              </div>

              {/* My Resumes */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">My Resumes</p>
                <MyResumesPanel onProfileActivated={handleProfileActivated} />
              </div>

              {/* Active profile summary */}
              {sessionProfile && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Active Profile</p>
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-bold text-white">
                          {sessionProfile.name?.[0]?.toUpperCase() ?? '?'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{sessionProfile.name || 'Profile'}</p>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-medium ${sessionProfile.from_cache ? 'text-blue-600' : 'text-emerald-600'}`}>
                            {sessionProfile.from_cache ? '💾 DB' : '🆕 LLM'}
                          </span>
                          {sessionProfile.has_preferences && (
                            <span className="text-[10px] text-violet-600 font-medium">· Prefs ✓</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {sessionProfile.skills_summary.slice(0, 4).map((s) => (
                        <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-medium">
                          {s}
                        </span>
                      ))}
                      {sessionProfile.skills_summary.length > 4 && (
                        <span className="text-[10px] text-slate-400">+{sessionProfile.skills_summary.length - 4}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Usage */}
              {usage && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">API Usage</p>
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600 font-medium">Requests this hour</span>
                      <span className={`text-xs font-bold tabular-nums ${
                        usage.remaining === 0 ? 'text-red-600' :
                        usage.remaining <= 1 ? 'text-amber-600' : 'text-slate-800'
                      }`}>
                        {usage.used} / {usage.limit}
                      </span>
                    </div>
                    {/* Bar */}
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          usage.remaining === 0 ? 'bg-red-500' :
                          usage.remaining <= 1 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(1, usage.used / usage.limit) * 100}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {usage.remaining} remaining · resets in {usage.resets_in_minutes} min
                    </p>
                  </div>
                </div>
              )}

              {/* Full profile data */}
              {sessionProfile && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Extracted Data</p>
                  <ProfileDataPanel profile={sessionProfile} compact />
                </div>
              )}
            </div>
          </aside>
        )}

        {/* ── Main content ──────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-6">
          {activeTab === 'find-jobs' && (
            <JobDiscoveryView
              hasPreferences={sessionProfile?.has_preferences ?? false}
              onRefreshUsage={refreshUsage}
            />
          )}

          {activeTab === 'analyze-job' && (
            <div className="space-y-6 max-w-5xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <JobInputPanel
                    jobDescription={jobDescription}
                    onJobDescriptionChange={setJobDescription}
                    onAnalyze={handleAnalyze}
                    onGenerateResume={handleGenerateResume}
                    isAnalyzing={analyzing}
                    isGenerating={generating}
                  />
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold text-slate-800">Match Analysis</h2>
                    <p className="text-sm text-slate-500 mt-0.5">AI-powered fit assessment against your profile.</p>
                  </div>
                  <AnalysisPanel result={matchResult} loading={analyzing} error={matchError} />
                </div>
              </div>

              {showResumePanel && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <div className="mb-4 border-b border-slate-100 pb-4">
                    <h2 className="text-lg font-semibold text-slate-800">Generated Resume</h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                      ATS-optimized · Built exclusively from your resume · Never invents information.
                    </p>
                  </div>
                  <ResumePanel result={resumeResult} loading={generating} error={resumeError} />
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
