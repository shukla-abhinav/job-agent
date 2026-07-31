import { LoadingSpinner } from './LoadingSpinner';

interface JobInputPanelProps {
  jobDescription: string;
  onJobDescriptionChange: (value: string) => void;
  onAnalyze: () => void;
  onGenerateResume: () => void;
  isAnalyzing: boolean;
  isGenerating: boolean;
}

export function JobInputPanel({
  jobDescription,
  onJobDescriptionChange,
  onAnalyze,
  onGenerateResume,
  isAnalyzing,
  isGenerating,
}: JobInputPanelProps) {
  const isLoading = isAnalyzing || isGenerating;
  const isEmpty = !jobDescription.trim();

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Job Description</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Paste the full job posting below.
        </p>
      </div>

      {/* Textarea */}
      <textarea
        id="job-description-input"
        className="
          flex-1 min-h-[320px] w-full rounded-xl border border-slate-200
          bg-white px-4 py-3 text-sm text-slate-800 placeholder-slate-400
          resize-none outline-none transition-all duration-150
          focus:border-blue-400 focus:ring-2 focus:ring-blue-100
          disabled:opacity-60 disabled:cursor-not-allowed
        "
        placeholder="Paste the full job description here…

Example:
We are looking for a Senior Backend Engineer to join our platform team.
You'll be building scalable microservices using Python, FastAPI, and Kubernetes..."
        value={jobDescription}
        onChange={(e) => onJobDescriptionChange(e.target.value)}
        disabled={isLoading}
        aria-label="Job description input"
      />

      {/* Character count */}
      <div className="text-xs text-slate-400 text-right -mt-2">
        {jobDescription.length} characters
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2.5">
        <button
          id="analyze-match-btn"
          onClick={onAnalyze}
          disabled={isLoading || isEmpty}
          className="
            w-full flex items-center justify-center gap-2 px-5 py-3
            rounded-xl font-semibold text-sm
            bg-blue-600 text-white
            hover:bg-blue-700 active:bg-blue-800
            disabled:bg-blue-300 disabled:cursor-not-allowed
            transition-colors duration-150
          "
          aria-label="Analyze job match"
        >
          {isAnalyzing ? (
            <>
              <LoadingSpinner size="sm" />
              Analyzing…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Analyze Match
            </>
          )}
        </button>

        <button
          id="generate-resume-btn"
          onClick={onGenerateResume}
          disabled={isLoading || isEmpty}
          className="
            w-full flex items-center justify-center gap-2 px-5 py-3
            rounded-xl font-semibold text-sm
            bg-white text-slate-700 border border-slate-200
            hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-150
          "
          aria-label="Generate tailored resume"
        >
          {isGenerating ? (
            <>
              <LoadingSpinner size="sm" />
              Generating…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Generate Resume
            </>
          )}
        </button>
      </div>

      {/* Hint */}
      {isEmpty && (
        <p className="text-xs text-slate-400 text-center">
          Enter a job description to get started.
        </p>
      )}
    </div>
  );
}
