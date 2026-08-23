import type { UploadedProfile } from '../types';

interface ProfileDataPanelProps {
  profile: UploadedProfile;
  /** When true, panel is shown inside the onboarding flow (before main app). */
  compact?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  Languages:            'bg-blue-50 text-blue-700 border-blue-100',
  Frameworks:           'bg-violet-50 text-violet-700 border-violet-100',
  'Cloud & Infrastructure': 'bg-sky-50 text-sky-700 border-sky-100',
  Databases:            'bg-emerald-50 text-emerald-700 border-emerald-100',
  Tools:                'bg-amber-50 text-amber-700 border-amber-100',
  default:              'bg-slate-50 text-slate-600 border-slate-200',
};

function categoryColor(name: string): string {
  return CATEGORY_COLORS[name] ?? CATEGORY_COLORS.default;
}

export function ProfileDataPanel({ profile, compact = false }: ProfileDataPanelProps) {
  const isFromDb = profile.processed_by === 'db' || profile.from_cache;

  const sourceLabel = isFromDb
    ? { icon: '💾', text: 'Loaded from database — previously processed', cls: 'bg-blue-50 text-blue-700 border-blue-200' }
    : { icon: '🆕', text: 'Newly extracted from resume', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };

  const hasBothSources = profile.has_preferences;

  return (
    <div id="profile-data-panel" className={`space-y-5 ${compact ? '' : 'max-w-3xl mx-auto'}`}>

      {/* ── Source badge ─────────────────────────────────────────────────────── */}
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${sourceLabel.cls}`}>
        <span>{sourceLabel.icon}</span>
        <span>Resume Data · {sourceLabel.text}</span>
      </div>

      {/* ── Profile sources checklist ────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Profile Sources</p>
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <span className="text-sm font-medium text-slate-800">Resume uploaded</span>
              <span className="ml-2 text-xs text-slate-400">
                {profile.experience_count} experience{profile.experience_count !== 1 ? 's' : ''} ·{' '}
                {profile.education_count} education{profile.education_count !== 1 ? 's' : ''} ·{' '}
                {Object.values(profile.skills_by_category).flat().length} skills
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${profile.has_preferences ? 'bg-emerald-100' : 'bg-slate-100'}`}>
              {profile.has_preferences ? (
                <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <span className={`text-sm font-medium ${profile.has_preferences ? 'text-slate-800' : 'text-slate-400'}`}>
              {profile.has_preferences ? 'Preferences uploaded' : 'No preferences file — using defaults'}
            </span>
          </div>
        </div>

        {/* Combined use banner */}
        {hasBothSources && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 border border-indigo-100">
            <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-xs font-semibold text-indigo-700">
              Resume + Preferences are being used together for personalized listings
            </span>
          </div>
        )}
      </div>

      {/* ── Skills by category ───────────────────────────────────────────────── */}
      {Object.keys(profile.skills_by_category).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Skills</p>
          <div className="space-y-3">
            {Object.entries(profile.skills_by_category).map(([category, skills]) => (
              <div key={category}>
                <p className="text-[11px] font-semibold text-slate-400 mb-1.5">{category}</p>
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${categoryColor(category)}`}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Work experience ───────────────────────────────────────────────────── */}
      {profile.experience_entries.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Work Experience</p>
          <div className="space-y-4">
            {profile.experience_entries.map((exp, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                  {i < profile.experience_entries.length - 1 && (
                    <div className="w-px flex-1 bg-slate-200 mt-1" />
                  )}
                </div>
                <div className="pb-4 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-800">{exp.title}</p>
                    <p className="text-xs text-slate-500">{exp.company}</p>
                    {exp.period && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        {exp.period}
                      </span>
                    )}
                  </div>
                  {exp.bullets.length > 0 && (
                    <ul className="mt-1.5 space-y-1">
                      {exp.bullets.slice(0, 3).map((b, bi) => (
                        <li key={bi} className="text-xs text-slate-500 flex items-start gap-1.5">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-slate-300 flex-shrink-0" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Education ─────────────────────────────────────────────────────────── */}
      {profile.education_entries.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Education</p>
          <div className="space-y-2.5">
            {profile.education_entries.map((edu, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M12 14l9-5-9-5-9 5 9 5z" /><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{edu.degree}</p>
                  <p className="text-xs text-slate-500">{edu.institution} {edu.period && `· ${edu.period}`}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Preferences summary ───────────────────────────────────────────────── */}
      {profile.has_preferences && (profile.preferences_roles.length > 0 || profile.preferences_locations.length > 0) && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Preferences</p>
          <div className="space-y-2.5">
            {profile.preferences_roles.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-slate-400 mb-1.5">Target Roles</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.preferences_roles.map((r) => (
                    <span key={r} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100">{r}</span>
                  ))}
                </div>
              </div>
            )}
            {profile.preferences_locations.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-slate-400 mb-1.5">Preferred Locations</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.preferences_locations.map((l) => (
                    <span key={l} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-100">{l}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
