import { useEffect, useState } from 'react';
import type { JobListing, MatchResult, ResumeSuggestion, ResumeResult } from '../../types';


interface JobDetailModalProps {
  job: JobListing;
  matchResult: MatchResult | null;
  suggestions: ResumeSuggestion | null;
  builtResume: ResumeResult | null;
  analyzingMatch: boolean;
  analyzingSuggestions: boolean;
  buildingResume: boolean;
  matchError: string | null;
  suggestionsError: string | null;
  resumeBuildError: string | null;
  onClose: () => void;
  onAnalyze: () => void;
  onSuggest: () => void;
  onBuildResume: () => void;
}

// ─── Utility components ───────────────────────────────────────────────────────

function ScoreRing({ score, recommendation }: { score: number; recommendation: string }) {
  const color = recommendation === 'Apply' ? '#10b981' : recommendation === 'Consider' ? '#f59e0b' : '#ef4444';
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative flex items-center justify-center w-28 h-28 flex-shrink-0">
      <svg className="w-28 h-28 -rotate-90" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={radius} strokeWidth="8" stroke="#f1f5f9" fill="none" />
        <circle cx="48" cy="48" r={radius} strokeWidth="8" fill="none" stroke={color}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }} />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold text-slate-900">{score}</span>
        <span className="text-xs text-slate-500">/ 100</span>
      </div>
    </div>
  );
}

function RecommendationBadge({ recommendation }: { recommendation: string }) {
  const cfg: Record<string, { bg: string; dot: string; label: string }> = {
    Apply:   { bg: 'bg-emerald-100 border-emerald-200 text-emerald-800', dot: 'bg-emerald-500', label: '✓ Strong Apply' },
    Consider:{ bg: 'bg-amber-100 border-amber-200 text-amber-800',   dot: 'bg-amber-500',   label: '~ Consider' },
    Skip:    { bg: 'bg-red-100 border-red-200 text-red-800',         dot: 'bg-red-500',     label: '✗ Skip' },
  };
  const c = cfg[recommendation] ?? { bg: 'bg-slate-100 border-slate-200 text-slate-700', dot: 'bg-slate-400', label: recommendation };
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-semibold ${c.bg}`}>
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-3">
      <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin" />
      {label && <p className="text-sm text-slate-500">{label}</p>}
    </div>
  );
}

function TagList({ items, color }: { items: string[]; color: 'red' | 'blue' | 'emerald' | 'violet' | 'amber' }) {
  const s = { red:'bg-red-50 border-red-100 text-red-700', blue:'bg-blue-50 border-blue-100 text-blue-700',
    emerald:'bg-emerald-50 border-emerald-100 text-emerald-700', violet:'bg-violet-50 border-violet-100 text-violet-700',
    amber:'bg-amber-50 border-amber-100 text-amber-700' }[color];
  if (!items.length) return <p className="text-sm text-slate-400 italic">None identified.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => <span key={i} className={`px-2.5 py-1 rounded-lg border text-xs font-medium ${s}`}>{item}</span>)}
    </div>
  );
}

// ─── Copy buttons ─────────────────────────────────────────────────────────────

function CopyButton({ id, label, icon, getContent, tooltipTitle, tooltipBody, buttonClass }: {
  id?: string;
  label: string;
  icon: React.ReactNode;
  getContent: () => string;
  tooltipTitle: string;
  tooltipBody: string;
  buttonClass: string;
}) {
  const [copied, setCopied] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(getContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  return (
    <div className="relative">
      <button
        id={id}
        onClick={handleCopy}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-xl transition-all border ${buttonClass}`}
      >
        {copied ? (
          <>
            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-emerald-700">Copied!</span>
          </>
        ) : (<>{icon}{label}</>)}
      </button>
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-72 pointer-events-none">
          <div className="bg-slate-900 text-white text-xs rounded-xl px-3.5 py-3 leading-relaxed shadow-xl">
            <p className="font-semibold mb-1">💡 {tooltipTitle}</p>
            <p className="text-slate-300">{tooltipBody}</p>
          </div>
          <div className="flex justify-center"><div className="w-2.5 h-2.5 bg-slate-900 rotate-45 -mt-1.5" /></div>
        </div>
      )}
    </div>
  );
}

function resumeToMarkdown(resume: ResumeResult, job: JobListing): string {
  const lines: string[] = [
    `# Tailored Resume — ${job.title} at ${job.company}`,
    '',
    '---',
    '',
    '## Professional Summary',
    '',
    resume.summary,
    '',
    '---',
    '',
    '## Core Skills',
    '',
    resume.skills.join('  ·  '),
    '',
    '---',
    '',
    '## Experience',
    '',
  ];
  for (const exp of resume.experience) {
    lines.push(`### ${exp.title}`);
    lines.push(`**${exp.company}** · ${exp.period}`);
    lines.push('');
    for (const b of exp.bullets) lines.push(`- ${b}`);
    lines.push('');
  }
  lines.push('---', '', '## Projects', '');
  for (const proj of resume.projects) {
    lines.push(`### ${proj.name}`);
    lines.push(`**Tech:** ${proj.tech.join(', ')}`);
    lines.push('');
    lines.push(proj.description);
    lines.push('');
  }
  lines.push('---');
  lines.push('');
  lines.push('*Generated by AI Job Matcher — paste this Markdown or JSON into any LLM (ChatGPT, Claude, Gemini) to generate a beautifully formatted resume in any style, language, or template.*');
  return lines.join('\n');
}


// ─── Resume preview (compact, text only) ─────────────────────────────────────

function ResumePreviewCompact({ resume }: { resume: ResumeResult }) {
  return (
    <div className="space-y-4 text-sm">
      {/* Summary */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Summary</p>
        <p className="text-slate-700 leading-relaxed">{resume.summary}</p>
      </div>

      {/* Skills */}
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Skills</p>
        <div className="flex flex-wrap gap-1.5">
          {resume.skills.map((s, i) => (
            <span key={i} className="px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 rounded-lg">{s}</span>
          ))}
        </div>
      </div>

      {/* Experience */}
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Experience</p>
        <div className="space-y-3">
          {resume.experience.map((exp, i) => (
            <div key={i} className="border-l-2 border-blue-200 pl-3">
              <div className="flex items-baseline justify-between">
                <p className="font-semibold text-slate-900">{exp.title}</p>
                <p className="text-xs text-slate-400">{exp.period}</p>
              </div>
              <p className="text-xs text-slate-500 mb-1.5">{exp.company}</p>
              <ul className="space-y-1">
                {exp.bullets.map((b, j) => (
                  <li key={j} className="flex items-start gap-1.5 text-slate-700">
                    <span className="text-blue-400 mt-0.5 flex-shrink-0">›</span>
                    <span className="leading-snug">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Projects */}
      {resume.projects.length > 0 && (
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Projects</p>
          <div className="space-y-2">
            {resume.projects.map((p, i) => (
              <div key={i} className="p-3 bg-white border border-slate-200 rounded-xl">
                <p className="font-semibold text-slate-900 text-sm">{p.name}</p>
                <p className="text-xs text-blue-600 mb-1">{p.tech.join(' · ')}</p>
                <p className="text-slate-600">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function JobDetailModal({
  job, matchResult, suggestions, builtResume,
  analyzingMatch, analyzingSuggestions, buildingResume,
  matchError, suggestionsError, resumeBuildError,
  onClose, onAnalyze, onSuggest, onBuildResume,
}: JobDetailModalProps) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-8 pt-8 pb-5 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-slate-900 leading-tight">{job.title}</h2>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap text-sm text-slate-500">
                <span className="font-semibold text-slate-700">{job.company}</span>
                <span className="text-slate-300">·</span>
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {job.location}
                </span>
                {job.posted_at && <><span className="text-slate-300">·</span><span>{job.posted_at}</span></>}
              </div>
            </div>
            <button onClick={onClose} id="job-modal-close"
              className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
              <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {job.job_type && <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600">{job.job_type}</span>}
            {job.salary && <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">{job.salary}</span>}
            {job.apply_link && (
              <a href={job.apply_link} target="_blank" rel="noopener noreferrer" id="job-apply-button"
                onClick={(e) => e.stopPropagation()}
                className="ml-auto inline-flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700
                           text-white text-sm font-semibold rounded-full transition-colors shadow-sm shadow-blue-200">
                Apply Now
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">

          {/* Description */}
          <section>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Job Description</h3>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{job.description || 'No description available.'}</p>
          </section>

          {/* Match Analysis */}
          <section className="border-t border-slate-100 pt-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Profile Match</h3>
              {!matchResult && !analyzingMatch && (
                <button id="job-analyze-button" onClick={onAnalyze}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800
                             text-white text-sm font-semibold rounded-xl transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Analyze Fit
                </button>
              )}
            </div>
            {analyzingMatch && <Spinner label="Analyzing profile match…" />}
            {matchError && <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">{matchError}</div>}
            {matchResult && (
              <div className="space-y-5">
                <div className="flex items-center gap-6 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                  <ScoreRing score={matchResult.score} recommendation={matchResult.recommendation} />
                  <div className="flex-1">
                    <RecommendationBadge recommendation={matchResult.recommendation} />
                    <p className="mt-3 text-sm text-slate-600 leading-relaxed">{matchResult.reasoning}</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-2">✓ Strengths</h4>
                  <TagList items={matchResult.strengths} color="emerald" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-2">✗ Missing Skills</h4>
                  <TagList items={matchResult.missing_skills} color="red" />
                </div>
              </div>
            )}
          </section>

          {/* Resume Suggestions */}
          <section className="border-t border-slate-100 pt-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Resume Suggestions</h3>
              {!suggestions && !analyzingSuggestions && (
                <button id="job-suggest-button" onClick={onSuggest}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700
                             text-white text-sm font-semibold rounded-xl transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Get Suggestions
                </button>
              )}
            </div>
            {analyzingSuggestions && <Spinner label="Analyzing keyword gaps…" />}
            {suggestionsError && <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">{suggestionsError}</div>}
            {suggestions && (
              <div className="space-y-5">
                {suggestions.overall_advice && (
                  <div className="p-4 bg-violet-50 border border-violet-100 rounded-xl">
                    <p className="text-sm text-violet-800 leading-relaxed">{suggestions.overall_advice}</p>
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-2">Missing Keywords to Add</h4>
                  <TagList items={suggestions.missing_keywords} color="red" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2">Skills to Highlight / Add</h4>
                  <TagList items={suggestions.skills_to_add} color="blue" />
                </div>
                {suggestions.sections_to_update.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">Sections to Update</h4>
                    <ul className="space-y-1.5">
                      {suggestions.sections_to_update.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {suggestions.summary_tips.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-violet-700 uppercase tracking-wider mb-2">Summary Tips</h4>
                    <ul className="space-y-1.5">
                      {suggestions.summary_tips.map((t, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Build Resume CTA */}
                {!builtResume && !buildingResume && (
                  <div className="mt-2 p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-emerald-900 text-sm">Apply suggestions & build resume</p>
                      <p className="text-xs text-emerald-700 mt-0.5">
                        Gemini rewrites your resume weaving in all keywords — download as a beautiful PDF.
                      </p>
                    </div>
                    <button id="job-build-resume-button" onClick={onBuildResume}
                      className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600
                                 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors
                                 shadow-sm shadow-emerald-200 whitespace-nowrap">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Build Tailored Resume
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Built Resume */}
          {(buildingResume || builtResume || resumeBuildError) && (
            <section className="border-t border-slate-100 pt-8">
              {/* Section header with PDF + JSON buttons */}
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Tailored Resume</h3>
                  {builtResume && (
                    <p className="text-xs text-slate-400 mt-0.5">All suggestions applied · Copy to use with any LLM</p>
                  )}
                </div>
                {builtResume && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <CopyButton
                      id="resume-copy-md-button"
                      label="Copy Markdown"
                      icon={
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      }
                      getContent={() => resumeToMarkdown(builtResume, job)}
                      tooltipTitle="Use with any LLM"
                      tooltipBody="Paste this Markdown into ChatGPT, Claude, or Gemini and ask it to format, style, or convert your resume into any template."
                      buttonClass="bg-violet-50 hover:bg-violet-100 text-violet-700 border-violet-200"
                    />
                    <CopyButton
                      id="resume-copy-json-button"
                      label="Copy JSON"
                      icon={
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                      }
                      getContent={() => JSON.stringify({ resume: builtResume, context: { job_title: job.title, company: job.company } }, null, 2)}
                      tooltipTitle="Use with any LLM"
                      tooltipBody="Paste this structured JSON into any AI model to generate a beautifully formatted resume in any style, language, or document format."
                      buttonClass="bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                    />
                  </div>
                )}
              </div>

              {buildingResume && <Spinner label="Building your tailored resume with all suggestions applied…" />}
              {resumeBuildError && <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">{resumeBuildError}</div>}
              {builtResume && <ResumePreviewCompact resume={builtResume} />}
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-100 flex items-center justify-between flex-shrink-0 bg-slate-50/50">
          <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
            ← Back to Jobs
          </button>
          {job.apply_link && (
            <a href={job.apply_link} target="_blank" rel="noopener noreferrer" id="job-apply-footer-button"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700
                         text-white text-sm font-bold rounded-xl transition-colors shadow-sm shadow-blue-200">
              Apply Now
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
