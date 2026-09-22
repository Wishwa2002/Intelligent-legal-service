import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/authApi";

export const StaffLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active session tracking without aggressive force-redirect
  const [activeSession, setActiveSession] = useState(() => {
    return authApi.getCurrentAdmin() || authApi.getCurrentClerk();
  });

  const handleSignOut = () => {
    authApi.logoutAll();
    setActiveSession(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await authApi.login(email.trim(), password);
      const role = res.role?.toLowerCase();
      if (role === "admin") {
        authApi.setCurrentAdmin(res);
        navigate("/admin");
      } else if (role === "clerk") {
        authApi.setCurrentClerk(res);
        navigate("/clerk/cases");
      } else {
        setError("Access denied. You are not authorised to use this portal.");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || "Invalid credentials. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans">
      {/* ── Left Panel ─────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#0b0f1a] flex-col items-center justify-center px-16">
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(212,175,55,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.8) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Decorative corner lines */}
        <div className="absolute top-10 left-10 w-24 h-24 border-t-2 border-l-2 border-amber-500/30 rounded-tl-2xl" />
        <div className="absolute top-10 right-10 w-24 h-24 border-t-2 border-r-2 border-amber-500/30 rounded-tr-2xl" />
        <div className="absolute bottom-10 left-10 w-24 h-24 border-b-2 border-l-2 border-amber-500/30 rounded-bl-2xl" />
        <div className="absolute bottom-10 right-10 w-24 h-24 border-b-2 border-r-2 border-amber-500/30 rounded-br-2xl" />

        {/* Glow blob */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-amber-500/10 blur-[80px] pointer-events-none" />

        {/* Scales icon */}
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-28 h-28 mb-8 relative flex items-center justify-center">
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border border-amber-500/30 animate-pulse" />
            <div className="absolute inset-3 rounded-full border border-amber-400/20" />
            {/* Icon */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400/20 to-amber-600/10 flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.3)]">
              <svg viewBox="0 0 64 64" fill="none" className="w-11 h-11">
                {/* Scales of justice */}
                <line x1="32" y1="6" x2="32" y2="58" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="12" y1="16" x2="52" y2="16" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="12" y1="16" x2="4" y2="32" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"/>
                <line x1="52" y1="16" x2="60" y2="32" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"/>
                <path d="M4 32 Q8 38 12 32" stroke="#F59E0B" strokeWidth="2" fill="none" strokeLinecap="round"/>
                <path d="M52 32 Q56 38 60 32" stroke="#F59E0B" strokeWidth="2" fill="none" strokeLinecap="round"/>
                <line x1="22" y1="58" x2="42" y2="58" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round"/>
                <circle cx="32" cy="16" r="2.5" fill="#F59E0B"/>
              </svg>
            </div>
          </div>

          <h1 className="text-5xl font-bold tracking-tight mb-3" style={{ fontFamily: "Georgia, serif" }}>
            <span className="text-white">Legal</span>
            <span className="text-amber-400">Ease</span>
          </h1>
          <p className="text-amber-400/80 text-sm font-semibold uppercase tracking-[0.25em] mb-6">
            Intelligent Legal Operations
          </p>
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-amber-500/60 to-transparent mb-6" />
          <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
            Secure staff portal for authorised personnel. All sessions are
            encrypted and monitored.
          </p>

          {/* Trust badges */}
          <div className="mt-10 flex items-center gap-6">
            {["256-bit SSL", "Encrypted Sessions", "Audit Logged"].map((t) => (
              <div key={t} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span className="w-1 h-1 rounded-full bg-amber-500/60" />
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Panel ────────────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-[#0f1420] px-6 py-12 relative overflow-hidden">
        {/* Subtle glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-amber-500/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="w-full max-w-sm relative z-10">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 text-lg shadow-lg">
                ⚖️
              </div>
              <span className="text-xl font-bold text-white" style={{ fontFamily: "Georgia, serif" }}>
                Legal<span className="text-amber-400">Ease</span>
              </span>
            </Link>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-1">Sign in to your account</h2>
            <p className="text-slate-400 text-sm">Enter your credentials to continue</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 flex items-start gap-2.5 bg-rose-950/40 border border-rose-800/50 text-rose-300 text-sm p-4 rounded-xl">
              <svg className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
              </svg>
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Active Session Notice */}
          {activeSession && (
            <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold text-white">Signed in as {activeSession.name}</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono uppercase font-bold border border-amber-500/30">
                  {activeSession.role}
                </span>
              </div>
              <p className="text-slate-400 mb-3 text-[11px]">
                You have an active session. You can go directly to your portal, or sign in below with different credentials.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => navigate(activeSession.role?.toLowerCase() === "admin" ? "/admin" : "/clerk/cases")}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition cursor-pointer"
                >
                  Go to Dashboard
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/>
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@firm.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/60 border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all hover:border-slate-600"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
                  </svg>
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full pl-10 pr-16 py-3 bg-slate-800/60 border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all hover:border-slate-600 font-mono tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 px-4 text-xs font-semibold text-slate-400 hover:text-indigo-300 transition-colors"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="relative w-full mt-2 overflow-hidden group bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-500/25 transition-all duration-200 flex items-center justify-center gap-2"
            >
              {/* Shine effect */}
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-8 flex items-center gap-4">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-xs text-slate-600 font-medium">SECURE ACCESS</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          {/* Security note */}
          <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/>
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-300 mb-0.5">Authorised Personnel Only</p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                This portal is restricted to verified staff members. All access is logged and audited.
              </p>
            </div>
          </div>

          {/* Back link */}
          <div className="mt-8 flex items-center justify-between text-xs text-slate-600">
            <Link to="/" className="hover:text-slate-400 transition-colors flex items-center gap-1.5 group">
              <svg className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/>
              </svg>
              Back to main site
            </Link>
            <span className="text-slate-700">© 2025 LegalEase</span>
          </div>
        </div>
      </div>
    </div>
  );
};
