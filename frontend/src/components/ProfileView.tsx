import { useState } from 'react';
import { clearSession } from '../api/client';
import type { UploadedProfile } from '../types';

interface ProfileViewProps {
  profile: UploadedProfile;
  userEmail: string;
  onClear: () => void;
  onLogout: () => void;
}

export function ProfileView({ profile, userEmail, onClear, onLogout }: ProfileViewProps) {
  const [clearing, setClearing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleClear = async () => {
    setClearing(true);
    setShowMenu(false);
    try {
      await clearSession();
    } catch { /* best-effort */ } finally {
      setClearing(false);
      onClear();
    }
  };

  const initials = profile.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const displaySkills = profile.skills_summary.slice(0, 5);

  return (
    <div id="profile-view" className="flex items-center gap-3 relative">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-md">
        <span className="text-[11px] font-bold text-white">{initials || '?'}</span>
      </div>

      {/* Name + badges */}
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-slate-800 truncate max-w-[140px]" title={profile.name}>
            {profile.name || 'Profile loaded'}
          </span>

          {/* From cache / LLM badge */}
          <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border whitespace-nowrap
            ${profile.from_cache
              ? 'bg-blue-50 text-blue-600 border-blue-100'
              : 'bg-emerald-50 text-emerald-600 border-emerald-100'
            }`}
          >
            {profile.from_cache ? '💾 From DB' : '🆕 From Resume'}
          </span>

          {profile.has_preferences && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-100 whitespace-nowrap">
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Preferences Active
            </span>
          )}
        </div>

        {/* Skill chips */}
        {displaySkills.length > 0 && (
          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            {displaySkills.map((s) => (
              <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">{s}</span>
            ))}
            {profile.skills_summary.length > 5 && (
              <span className="text-[10px] text-slate-400">+{profile.skills_summary.length - 5}</span>
            )}
          </div>
        )}
      </div>

      {/* User menu button */}
      <div className="ml-auto relative flex-shrink-0">
        <button
          id="profile-menu-btn"
          onClick={() => setShowMenu((s) => !s)}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown */}
        {showMenu && (
          <>
            {/* backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <div className="absolute right-0 top-full mt-2 z-50 min-w-[200px] bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 overflow-hidden">
              {/* User info header */}
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-[11px] text-slate-400">Signed in as</p>
                <p className="text-xs font-semibold text-slate-700 truncate">{userEmail}</p>
              </div>

              <button
                id="change-profile-btn"
                onClick={handleClear}
                disabled={clearing}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors text-left"
              >
                {clearing ? (
                  <span className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                )}
                Change Resume
              </button>

              <button
                id="logout-btn"
                onClick={() => { setShowMenu(false); onLogout(); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Log Out
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
