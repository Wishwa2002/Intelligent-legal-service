import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/authApi";

export const StaffLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active session tracking — picks up Admin, Clerk, or Lawyer sessions
  const [activeSession, setActiveSession] = useState(() => {
  try {
    return authApi.getCurrentStaff?.() ?? null;
  } catch (error) {
    console.error("Failed to load active session:", error);
    return null;
  }
});

  const handleSignOut = () => {
    authApi.logoutAll();
    setActiveSession(null);
  };

  const getDashboardPath = (role?: string) => {
    const r = role?.toLowerCase();
    if (r === "admin") return "/admin";
    if (r === "lawyer") return "/lawyer/dashboard";
    return "/clerk/cases";
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

    const role = (res.role ?? (res as { Role?: string }).Role)?.toLowerCase();

    if (!role) {
      setError("Login successful but role information is missing.");
      return;
    }

    switch (role) {
      case "admin":
        authApi.setCurrentAdmin(res);
        navigate("/admin");
        break;

      case "clerk":
        authApi.setCurrentClerk(res);
        navigate("/clerk/cases");
        break;

      case "lawyer":
        authApi.setCurrentLawyer(res);
        navigate("/lawyer/dashboard");
        break;

      default:
        setError(
          "Access denied. You are not authorised to use this portal."
        );
    }

  } catch (err: unknown) {
    setError(
      (axios.isAxiosError<{ message?: string }>(err) ? err.response?.data?.message : undefined) ||
      (err instanceof Error ? err.message : undefined) ||
      "Invalid credentials. Please try again."
    );
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen flex font-sans bg-white">
      {/* ── Left Panel — Brand ─────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[46%] relative overflow-hidden bg-[#0B1E3F] flex-col justify-between px-14 py-14">
        {/* Fine grid texture */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(201,167,92,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(201,167,92,0.9) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        {/* Soft glow */}
        <div className="absolute top-1/4 -left-24 w-80 h-80 rounded-full bg-blue-500/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-72 h-72 rounded-full bg-[#C9A75C]/10 blur-[90px] pointer-events-none" />

        {/* Corner frame */}
        <div className="absolute top-8 left-8 w-16 h-16 border-t border-l border-[#C9A75C]/40 rounded-tl-xl" />
        <div className="absolute bottom-8 right-8 w-16 h-16 border-b border-r border-[#C9A75C]/40 rounded-br-xl" />

        {/* Top: wordmark */}
        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#C9A75C]/15 border border-[#C9A75C]/30 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#C9A75C" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M5 7h14M5 7L2.5 12.5a2.5 2.5 0 005 0L5 7zm14 0l-2.5 5.5a2.5 2.5 0 005 0L19 7zM8.5 21h7" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-white tracking-tight" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
              Legal<span className="text-[#C9A75C]">Ease</span>
            </span>
          </Link>
        </div>

        {/* Middle: message */}
        <div className="relative z-10 max-w-sm">
          <p className="text-[#C9A75C] text-xs font-semibold uppercase tracking-[0.24em] mb-5">
            Intelligent Legal Operations
          </p>
          <h1
            className="text-[2.35rem] leading-[1.15] font-semibold text-white mb-5"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Secure access for authorised legal professionals.
          </h1>
          <p className="text-slate-300/90 text-[15px] leading-relaxed">
            Case files, client records and firm operations — all in one
            trusted workspace, built for the standards your practice
            requires.
          </p>

          {/* Illustration: scales of justice, minimal line art */}
          <div className="mt-12 flex items-center justify-center">
            <svg viewBox="0 0 200 140" className="w-56 h-auto opacity-90" fill="none">
              <line x1="100" y1="10" x2="100" y2="112" stroke="#C9A75C" strokeWidth="1.6" strokeLinecap="round" />
              <line x1="38" y1="30" x2="162" y2="30" stroke="#C9A75C" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="100" cy="30" r="3.5" fill="#C9A75C" />
              <line x1="38" y1="30" x2="18" y2="64" stroke="#8FA3C7" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="162" y1="30" x2="182" y2="64" stroke="#8FA3C7" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M18 64 Q30 82 42 64" stroke="#8FA3C7" strokeWidth="1.2" fill="none" strokeLinecap="round" />
              <path d="M158 64 Q170 82 182 64" stroke="#8FA3C7" strokeWidth="1.2" fill="none" strokeLinecap="round" />
              <line x1="72" y1="112" x2="128" y2="112" stroke="#C9A75C" strokeWidth="1.6" strokeLinecap="round" />
              <line x1="100" y1="112" x2="100" y2="124" stroke="#C9A75C" strokeWidth="1.6" strokeLinecap="round" />
              <line x1="80" y1="124" x2="120" y2="124" stroke="#C9A75C" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Bottom: trust indicators */}
        <div className="relative z-10 flex items-center gap-6 pt-8 border-t border-white/10">
          {["256-bit encryption", "Session audit logs", "SOC 2-aligned controls"].map((t) => (
            <div key={t} className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <svg className="w-3 h-3 text-[#C9A75C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              {t}
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Panel — Form ─────────────────────────────────────── */}
      <div className="w-full lg:w-[54%] flex items-center justify-center bg-white px-6 py-14 relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50 rounded-full blur-[120px] opacity-60 pointer-events-none" />

        <div className="w-full max-w-sm relative z-10">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-[#0B1E3F] flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" fill="none" stroke="#C9A75C" strokeWidth={1.6}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M5 7h14M5 7L2.5 12.5a2.5 2.5 0 005 0L5 7zm14 0l-2.5 5.5a2.5 2.5 0 005 0L19 7zM8.5 21h7" />
                </svg>
              </div>
              <span className="text-xl font-semibold text-[#0B1E3F]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                Legal<span className="text-[#A8842A]">Ease</span>
              </span>
            </Link>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-[#0B1E3F] mb-1.5">Sign in to your account</h2>
            <p className="text-slate-500 text-sm">Enter your credentials to access the staff portal.</p>
          </div>

          {/* Error */}
          {error && (
            <div role="alert" className="mb-6 flex items-start gap-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-sm p-4 rounded-xl">
              <svg className="w-4 h-4 mt-0.5 shrink-0 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
              </svg>
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Active Session Notice */}
          {activeSession && (
            <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-semibold text-[#0B1E3F]">Signed in as {activeSession.name}</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold uppercase border border-amber-200">
                  {activeSession.role}
                </span>
              </div>
              <p className="text-amber-800/80 mb-3 text-[11px]">
                You have an active session. Continue to your portal, or sign in below with different credentials.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => navigate(getDashboardPath(activeSession.role))}
                  className="px-3.5 py-1.5 rounded-lg bg-[#0B1E3F] hover:bg-[#132A54] text-white font-semibold transition cursor-pointer"
                >
                  Go to Dashboard
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-amber-100/60 border border-amber-300 text-amber-900 transition cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all hover:border-slate-400"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  className="text-xs font-medium text-blue-700 hover:text-blue-800 transition-colors cursor-pointer"
                  onClick={() => {}}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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
                  className="w-full pl-10 pr-16 py-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all hover:border-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 px-4 text-xs font-semibold text-slate-500 hover:text-blue-700 transition-colors cursor-pointer"
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
              className="relative w-full mt-2 overflow-hidden group bg-gradient-to-r from-[#0B1E3F] to-[#1D4ED8] hover:from-[#0E2547] hover:to-[#1E46C4] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm py-3.5 px-4 rounded-xl shadow-md shadow-blue-900/10 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
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
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">New to LegalEase</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Sign up link */}
          <Link
            to="/signup"
            className="w-full block text-center py-3 rounded-xl border border-slate-300 text-sm font-semibold text-[#0B1E3F] hover:border-blue-600 hover:text-blue-700 hover:bg-blue-50/50 transition"
          >
            Create a staff account
          </Link>

          {/* Security note */}
          <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#A8842A]/10 border border-[#A8842A]/25 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-[#A8842A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/>
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-0.5">Authorised personnel only</p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                This portal is restricted to verified staff members. All access is logged and audited.
              </p>
            </div>
          </div>

          {/* Back link */}
          <div className="mt-8 flex items-center justify-between text-xs text-slate-400">
            <Link to="/" className="hover:text-slate-600 transition-colors flex items-center gap-1.5 group">
              <svg className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/>
              </svg>
              Back to main site
            </Link>
            <span className="text-slate-300">© 2025 LegalEase</span>
          </div>
        </div>
      </div>
    </div>
  );
};
