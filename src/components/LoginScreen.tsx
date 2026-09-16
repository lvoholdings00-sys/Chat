import React, { useState } from 'react';
import { ArrowLeft, ShieldCheck, KeyRound, UserCheck } from 'lucide-react';
import type { User } from '../types';

interface LoginScreenProps {
  onLogin: (username: string, password: string) => Promise<void>;
  preloadedUsers: User[];
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, preloadedUsers }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please provide username and security passkey.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onLogin(username.trim(), password);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (uname: string) => {
    setUsername(uname);
    setPassword('Password123!');
    onLogin(uname, 'Password123!').catch((err) => {
      setError(err.message || 'Login failed');
    });
  };

  return (
    <div className="min-h-screen bg-[#0d0e12] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle tactical ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top back link matching original */}
      <a
        href="https://online.lvo-cloud.cloud"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-6 left-6 text-xs text-neutral-400 hover:text-white flex items-center gap-1.5 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to lvo-cloud.cloud
      </a>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-[#15171f]/95 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
          {/* Brand header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-3 shadow-inner">
              <span className="font-['Fraunces'] text-2xl font-bold tracking-widest">𝐋𝐕𝐎</span>
            </div>
            <h1 className="font-['Fraunces'] text-2xl font-bold text-white tracking-wider">
              𝐋𝐕𝐎 — CHAT
            </h1>
            <p className="text-xs text-neutral-400 mt-2 max-w-xs mx-auto leading-relaxed">
              Secure line. Members only — Accounts are created by the{' '}
              <span className="text-amber-400 font-semibold">𝐋𝐕𝐎 Gatekeepers</span>.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5 uppercase tracking-wider">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="e.g. admin or elena"
                required
                className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5 uppercase tracking-wider">
                Passkey
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••••••"
                required
                className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-1 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              {loading ? 'Authenticating Security Line…' : 'Sign in to Secure Network'}
            </button>
          </form>

          {/* Quick personnel switch for instant testing */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider text-center mb-3">
              One-Click Personnel Dispatch (Instant Test)
            </p>
            <div className="grid grid-cols-2 gap-2">
              {preloadedUsers.slice(0, 4).map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleQuickLogin(u.username)}
                  className="flex items-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 transition-all text-left group cursor-pointer"
                >
                  <span className="w-7 h-7 rounded-lg bg-neutral-800 flex items-center justify-center text-sm shrink-0">
                    {u.avatar}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-neutral-200 truncate group-hover:text-white">
                      {u.displayName}
                    </p>
                    <p className="text-[10px] text-neutral-500 truncate">
                      {u.isLeader ? 'Leader' : 'Member'} • @{u.username}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-neutral-500 text-center mt-3">
              Default demo passkey: <code className="text-neutral-400 bg-white/5 px-1 py-0.5 rounded">Password123!</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
