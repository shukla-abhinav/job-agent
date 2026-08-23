import { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';

interface AuthViewProps {
  onAuthenticated: () => void;
}

type AuthTab = 'login' | 'signup';

export function AuthView({ onAuthenticated }: AuthViewProps) {
  const [tab, setTab] = useState<AuthTab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  const { signup, login, loading, error } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (tab === 'signup') {
        await signup(email.trim().toLowerCase(), password);
      } else {
        await login(email.trim().toLowerCase(), password);
      }
      onAuthenticated();
    } catch {
      // error is shown via hook's error state
    }
  };

  const switchTab = (t: AuthTab) => {
    setTab(t);
    setEmail('');
    setPassword('');
    setTimeout(() => emailRef.current?.focus(), 50);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <span className="text-xl font-bold text-white">JobSense</span>
          <span className="ml-2 text-xs font-medium px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Beta</span>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm">
        {/* Tab switcher */}
        <div className="flex bg-slate-800/60 rounded-xl p-1 mb-6 border border-slate-700/50">
          {(['login', 'signup'] as AuthTab[]).map((t) => (
            <button
              key={t}
              id={`auth-tab-${t}`}
              onClick={() => switchTab(t)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-150 ${
                tab === t
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <form
          id="auth-form"
          onSubmit={handleSubmit}
          className="bg-slate-900/70 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 space-y-5"
        >
          <div>
            <h1 className="text-xl font-bold text-white">
              {tab === 'login' ? 'Welcome back' : 'Create your account'}
            </h1>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="auth-email" className="text-xs font-semibold text-slate-300">Email</label>
            <input
              ref={emailRef}
              id="auth-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500
                         focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="auth-password" className="text-xs font-semibold text-slate-300">Password</label>
            <div className="relative">
              <input
                id="auth-password"
                type={showPw ? 'text' : 'password'}
                autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={tab === 'signup' ? 8 : 1}
                className="w-full px-3.5 py-2.5 pr-10 text-sm bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
              />
              <button
                type="button"
                id="toggle-pw-visibility"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showPw ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                )}
              </button>
            </div>
            {tab === 'signup' && (
              <p className="text-xs text-slate-500">Minimum 8 characters</p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div id="auth-error" className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
              <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            id="auth-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500
                       text-white font-semibold text-sm transition-all duration-150 shadow-lg shadow-indigo-600/25
                       hover:shadow-indigo-500/30 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : tab === 'login' ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Log In
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Create Account
              </>
            )}
          </button>

          <p className="text-center text-xs text-slate-500">
            {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => switchTab(tab === 'login' ? 'signup' : 'login')}
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              {tab === 'login' ? 'Sign Up' : 'Log In'}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
