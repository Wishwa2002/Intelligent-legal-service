import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../../api/authApi";

// Pre-configured active clerks for quick demo sign-in
const DEMO_CLERKS = [
  {
    name: "Priyantha Silva",
    email: "clerk4@lexintelligence.com",
    department: "Property Dept (Case #48)",
    badge: "CRK004",
    initials: "PS",
  },
  {
    name: "Vithusan V",
    email: "vithusan2912@gmail.com",
    department: "Power of Attorney (Case #49)",
    badge: "CRK009",
    initials: "VV",
  },
  {
    name: "Alice Smith",
    email: "alice@example.com",
    department: "Property Dept",
    badge: "CRK001",
    initials: "AS",
  },
  {
    name: "Sarah Jenkins",
    email: "sarah.jenkins@lawfirm.com",
    department: "Litigation Dept",
    badge: "CRK007",
    initials: "SJ",
  },
];

export const ClerkLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in as clerk, redirect to cases
  useEffect(() => {
    if (authApi.isClerkAuthenticated()) {
      navigate("/clerk/cases", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email/username and password.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await authApi.login(email.trim(), password);

      if (res.role?.toLowerCase() !== "clerk") {
        setError(
          `Signed in as "${res.role}". This portal is reserved for legal clerks. Please log in with a clerk account.`
        );
        return;
      }

      authApi.setCurrentClerk({
        userId: res.userId,
        name: res.name,
        email: res.email,
        role: res.role,
        department: res.department,
        contact: res.contact,
      });

      navigate("/clerk/cases");
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Authentication failed. Please verify your credentials and ensure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (clerkEmail: string) => {
    setEmail(clerkEmail);
    setPassword("Clerk@123");
    try {
      setLoading(true);
      setError(null);
      const res = await authApi.login(clerkEmail, "Clerk@123");
      authApi.setCurrentClerk(res);
      navigate("/clerk/cases");
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Premium Ambient Lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-radial from-amber-500/10 via-slate-900/50 to-transparent pointer-events-none blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Logo */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8 relative z-10">
        <Link to="/" className="inline-flex items-center gap-3 group">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black text-2xl shadow-xl shadow-amber-500/20 group-hover:scale-105 transition-all">
            ⚖️
          </div>
          <div className="text-left">
            <span className="text-2xl font-bold text-white tracking-tight block font-serif">
              LegalEase
            </span>
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider block">
              Legal Operations & Clerk Portal
            </span>
          </div>
        </Link>
        <p className="mt-3 text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
          Authorized workspace for legal caseworkers, document audit officers, and case handlers.
        </p>
      </div>

      {/* Main Login Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/95 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-3xl sm:px-10 border border-slate-800">
          <div className="flex items-center justify-between pb-5 border-b border-slate-800 mb-6">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Clerk Verification</h2>
              <p className="text-xs text-slate-400 mt-0.5">Sign in to your assigned case queue</p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/25">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Staff Auth
            </span>
          </div>

          {error && (
            <div className="mb-6 bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs font-medium p-4 rounded-2xl flex items-start gap-3">
              <span className="text-base shrink-0">⚠️</span>
              <div className="flex-1 leading-relaxed">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Clerk ID or Official Email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 text-sm">
                  ✉️
                </span>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. clerk4@lexintelligence.com"
                  className="w-full pl-10 pr-3 py-2.5 text-xs font-medium bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400/80 focus:border-amber-400/80 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <span className="text-[10px] text-slate-500 font-mono">Confidential</span>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 text-sm">
                  🔒
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-2.5 text-xs font-medium bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400/80 focus:border-amber-400/80 transition font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs py-3 px-4 rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Credentials…</span>
                </>
              ) : (
                <>
                  <span>Access Clerk Cases Queue</span>
                  <span>→</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Logins Section */}
          <div className="mt-7 pt-6 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Instant Demo Profiles
              </span>
              <span className="text-[10px] text-amber-400 font-mono">1-Click Sign In</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {DEMO_CLERKS.map((clerk) => (
                <button
                  key={clerk.email}
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickDemoLogin(clerk.email)}
                  className="text-left p-2.5 rounded-xl border border-slate-800/90 bg-slate-950/60 hover:bg-slate-800 hover:border-amber-500/40 transition-all flex items-center justify-between group disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-amber-400 font-bold text-[10px] flex items-center justify-center group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors">
                      {clerk.initials}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white group-hover:text-amber-300 transition-colors">
                        {clerk.name}
                      </div>
                      <div className="text-[10px] text-slate-500">{clerk.department}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-semibold text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-lg group-hover:border-amber-500/30 group-hover:text-amber-400">
                    {clerk.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Public Careers & Jobs Button */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <Link
              to="/careers"
              className="w-full group relative flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-indigo-500/10 border border-amber-500/30 hover:border-amber-400 hover:from-amber-500/20 hover:to-indigo-500/20 transition-all shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-base group-hover:scale-110 transition-transform">
                  💼
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors flex items-center gap-1.5">
                    <span>Explore Careers & Job Openings</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase tracking-wider">
                      Public
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Open chamber vacancies, legal clerks, counsel & AI roles
                  </div>
                </div>
              </div>
              <span className="text-amber-400 text-sm font-bold group-hover:translate-x-1 transition-transform">
                →
              </span>
            </Link>
          </div>

          {/* Footer Portal Links */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
            <Link to="/" className="hover:text-amber-400 transition flex items-center gap-1">
              <span>←</span>
              <span>Main Portal</span>
            </Link>
            <Link to="/admin" className="text-amber-400 hover:text-amber-300 font-medium transition flex items-center gap-1">
              <span>Admin Console</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        <div className="text-center mt-6 text-[11px] text-slate-600">
          Protected System • 256-bit Encrypted Session Verification
        </div>
      </div>
    </div>
  );
};
