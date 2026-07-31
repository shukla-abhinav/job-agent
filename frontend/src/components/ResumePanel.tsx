import { useState } from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import type { ResumeResult } from '../types';

interface ResumePanelProps {
  result: ResumeResult | null;
  loading: boolean;
  error: string | null;
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({ title, children, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="
          w-full flex items-center justify-between px-4 py-3
          bg-slate-50 hover:bg-slate-100 transition-colors duration-100
          text-sm font-semibold text-slate-700
        "
        aria-expanded={open}
      >
        <span>{title}</span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="p-4 bg-white">
          {children}
        </div>
      )}
    </div>
  );
}

function CopyButton({ data }: { data: unknown }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      id="copy-resume-btn"
      className="
        flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
        bg-white border border-slate-200 text-slate-600
        hover:bg-slate-50 hover:border-slate-300 transition-colors duration-150
      "
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy JSON
        </>
      )}
    </button>
  );
}

function JsonBlock({ data }: { data: unknown }) {
  return (
    <pre className="text-xs text-slate-700 bg-slate-950 text-green-300 rounded-lg p-4 overflow-x-auto leading-relaxed font-mono whitespace-pre-wrap">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export function ResumePanel({ result, loading, error }: ResumePanelProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" label="Generating ATS-optimized resume…" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        id="resume-error"
        className="rounded-xl bg-red-50 border border-red-200 p-5 text-center"
      >
        <div className="text-3xl mb-2">⚠️</div>
        <p className="text-sm font-semibold text-red-700">Resume Generation Failed</p>
        <p className="text-xs text-red-600 mt-1 leading-relaxed">{error}</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex items-center justify-center py-10 text-center">
        <div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3 mx-auto">
            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-600">No resume generated yet</p>
          <p className="text-xs text-slate-400 mt-1">Click "Generate Resume" to create a tailored resume</p>
        </div>
      </div>
    );
  }

  return (
    <div id="resume-result" className="flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">
          Generated Resume
          <span className="ml-2 text-xs font-normal text-slate-400">from profile.md only</span>
        </h3>
        <CopyButton data={result} />
      </div>

      {/* Summary */}
      <CollapsibleSection title="📝 Summary">
        <p className="text-sm text-slate-700 leading-relaxed">{result.summary}</p>
      </CollapsibleSection>

      {/* Skills */}
      <CollapsibleSection title="🛠 Skills">
        <div className="flex flex-wrap gap-2">
          {result.skills.map((skill) => (
            <span
              key={skill}
              className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 text-xs font-medium"
            >
              {skill}
            </span>
          ))}
        </div>
      </CollapsibleSection>

      {/* Experience */}
      <CollapsibleSection title="💼 Experience">
        <div className="flex flex-col gap-5">
          {result.experience.map((exp, i) => (
            <div key={i}>
              <div className="flex items-start justify-between mb-1">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{exp.title}</p>
                  <p className="text-xs text-slate-500">{exp.company}</p>
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap ml-4">{exp.period}</span>
              </div>
              <ul className="mt-2 space-y-1">
                {exp.bullets.map((bullet, j) => (
                  <li key={j} className="text-xs text-slate-600 flex gap-2 leading-relaxed">
                    <span className="text-blue-400 flex-shrink-0 mt-0.5">›</span>
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Projects */}
      {result.projects.length > 0 && (
        <CollapsibleSection title="🚀 Projects" defaultOpen={false}>
          <div className="flex flex-col gap-4">
            {result.projects.map((proj, i) => (
              <div key={i}>
                <p className="text-sm font-semibold text-slate-800">{proj.name}</p>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{proj.description}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {proj.tech.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Raw JSON (collapsible) */}
      <CollapsibleSection title="{ } Raw JSON" defaultOpen={false}>
        <JsonBlock data={result} />
      </CollapsibleSection>
    </div>
  );
}
