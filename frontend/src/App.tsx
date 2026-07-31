import { useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { JobInputPanel } from './components/JobInputPanel';
import { AnalysisPanel } from './components/AnalysisPanel';
import { ResumePanel } from './components/ResumePanel';
import { JobDiscoveryView } from './components/JobDiscovery/JobDiscoveryView';
import { useJobAnalysis } from './hooks/useJobAnalysis';
import { useResumeGenerator } from './hooks/useResumeGenerator';

type Tab = 'find-jobs' | 'analyze-job';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('find-jobs');
  const [jobDescription, setJobDescription] = useState('');
  const { result: matchResult, loading: analyzing, error: matchError, analyze } = useJobAnalysis();
  const { result: resumeResult, loading: generating, error: resumeError, generate } = useResumeGenerator();

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) {
      toast.error('Please enter a job description first.');
      return;
    }
    const promise = analyze(jobDescription);
    toast.promise(promise, {
      loading: 'Analyzing job match…',
      success: 'Analysis complete!',
      error: (err) => `Analysis failed: ${err?.detail ?? 'Unknown error'}`,
    });
  };

  const handleGenerateResume = async () => {
    if (!jobDescription.trim()) {
      toast.error('Please enter a job description first.');
      return;
    }
    const promise = generate(jobDescription);
    toast.promise(promise, {
      loading: 'Generating resume…',
      success: 'Resume generated!',
      error: (err) => `Generation failed: ${err?.detail ?? 'Unknown error'}`,
    });
  };

  const showResumePanel = resumeResult || generating || resumeError;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'find-jobs',
      label: 'Find Jobs',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      id: 'analyze-job',
      label: 'Analyze Job',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'text-sm font-medium',
          duration: 4000,
        }}
      />

      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">AI Job Matcher</h1>
              <p className="text-xs text-slate-500 leading-tight">Personal job fit analyzer</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="flex items-center gap-1 bg-slate-100 rounded-xl p-1" role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150
                  ${activeTab === tab.id
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }
                `}
              >
                {tab.icon}
                {tab.label}
                {tab.id === 'find-jobs' && (
                  <span className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold">
                    AI
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main layout */}
      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* === Find Jobs Tab === */}
        {activeTab === 'find-jobs' && (
          <JobDiscoveryView />
        )}

        {/* === Analyze Job Tab === */}
        {activeTab === 'analyze-job' && (
          <div className="space-y-6">
            {/* Top row: Input (left) + Analysis (right) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

              {/* Left panel — Job Input */}
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

              {/* Right panel — Analysis */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-slate-800">Match Analysis</h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    AI-powered fit assessment against your profile.
                  </p>
                </div>
                <AnalysisPanel
                  result={matchResult}
                  loading={analyzing}
                  error={matchError}
                />
              </div>
            </div>

            {/* Bottom panel — Resume (only shown when triggered) */}
            {showResumePanel && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="mb-4 border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-semibold text-slate-800">Generated Resume</h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    ATS-optimized · Built exclusively from{' '}
                    <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-600">
                      profile.md
                    </code>
                    {' '}· Never invents information.
                  </p>
                </div>
                <ResumePanel
                  result={resumeResult}
                  loading={generating}
                  error={resumeError}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
