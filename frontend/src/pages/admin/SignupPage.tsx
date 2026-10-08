import React, { useState } from "react";
import { Link} from "react-router-dom";
import { authApi } from "../../api/authApi";

type AccountType = "lawyer" | "clerk";

interface SignupFormState {
  // Common
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  accountType: AccountType;
  // Lawyer-only
  phone: string;
  qualification: string;
  experience: string;
  licenseNumber: string;
  description: string;
  // Clerk-only
  contact: string;
  department: string;
}

const initialState: SignupFormState = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  accountType: "lawyer",
  phone: "",
  qualification: "",
  experience: "",
  licenseNumber: "",
  description: "",
  contact: "",
  department: "",
};

const ACCOUNT_TYPES: { value: AccountType; label: string; hint: string; icon: string }[] = [
  { value: "lawyer", label: "Lawyer", hint: "Create your professional lawyer profile", icon: "⚖" },
  { value: "clerk", label: "Clerk", hint: "Join the legal operations team", icon: "📄" },
];

export const SignupPage: React.FC = () => {
  const [form, setForm] = useState<SignupFormState>(initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof SignupFormState>(key: K, value: SignupFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = (): string | null => {
    if (!form.name.trim() || !form.email.trim() || !form.password || !form.confirmPassword) {
      return "Please fill in all required fields.";
    }
    if (form.password.length < 8) {
      return "Password must be at least 8 characters long.";
    }
    if (form.password !== form.confirmPassword) {
      return "Passwords do not match.";
    }
    if (form.accountType === "lawyer") {
      if (!form.phone.trim() || !form.qualification.trim() || !form.experience.trim() || !form.licenseNumber.trim()) {
        return "Please complete all lawyer-specific fields.";
      }
    }
    if (form.accountType === "clerk") {
      if (!form.contact.trim() || !form.department.trim()) {
        return "Please complete all clerk-specific fields.";
      }
    }
    return null;
  };

  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();

    setError(null);
    setSuccess(null);

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);

      const payload = {
        fullName: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role:
          form.accountType.charAt(0).toUpperCase() +
          form.accountType.slice(1),

        ...(form.accountType === "lawyer"
          ? {
              phoneNumber: form.phone.trim(),
              qualification: form.qualification.trim(),
              experience: Number(form.experience),
              licenseNumber: form.licenseNumber.trim(),
              profileDescription: form.description.trim(),
            }
          : {
              contact: form.contact.trim(),
              department: form.department.trim(),
            }),
      };

      const res = await authApi.signup(payload);
      // Show a success message and let the user sign in via login page
      setSuccess(res.message || "Account created successfully. Please sign in.");
      setForm(initialState);
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all hover:border-slate-400";

  const plainInputClass =
    "w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all hover:border-slate-400";

  const labelClass = "block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2";

  return (
    <div className="min-h-screen flex font-sans bg-white">
      {/* ── Left Panel — Brand ─────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[42%] relative overflow-hidden bg-[#0B1E3F] flex-col justify-between px-12 py-14">
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(201,167,92,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(201,167,92,0.9) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        <div className="absolute top-1/3 -right-24 w-80 h-80 rounded-full bg-blue-500/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-[#C9A75C]/10 blur-[90px] pointer-events-none" />

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

        {/* Middle: message + benefits */}
        <div className="relative z-10 max-w-sm">
          <p className="text-[#C9A75C] text-xs font-semibold uppercase tracking-[0.24em] mb-5">
            Join the practice
          </p>
          <h1
            className="text-[2.1rem] leading-[1.2] font-semibold text-white mb-6"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Built for lawyers and legal operations teams.
          </h1>

          <ul className="space-y-4">
            {[
              { t: "Centralised case management", d: "Track matters, deadlines and documents in one place." },
              { t: "Secure client collaboration", d: "Share updates with clients through an encrypted workspace." },
              { t: "Role-based access", d: "Lawyers and clerks each get tools suited to their work." },
            ].map((b) => (
              <li key={b.t} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#C9A75C]/15 border border-[#C9A75C]/40 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-2.5 h-2.5 text-[#C9A75C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{b.t}</p>
                  <p className="text-[13px] text-slate-400 leading-relaxed">{b.d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom: trust indicators */}
        <div className="relative z-10 flex items-center gap-6 pt-8 border-t border-white/10">
          {["256-bit encryption", "Audit logged", "Verified accounts"].map((t) => (
            <div key={t} className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="w-1 h-1 rounded-full bg-[#C9A75C]" />
              {t}
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Panel — Form ─────────────────────────────────────── */}
      <div className="w-full lg:w-[58%] flex items-center justify-center bg-white px-6 py-14 relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50 rounded-full blur-[120px] opacity-60 pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
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
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-[#0B1E3F] mb-1.5">Create your account</h2>
            <p className="text-slate-500 text-sm">Choose your role to get started.</p>
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

          {/* Success */}
          {success && (
            <div role="status" className="mb-6 flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm p-4 rounded-xl">
              <svg className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
              <div>
                <span className="leading-relaxed">{success}</span>
                <Link to="/login" className="block mt-2 font-semibold text-emerald-700 hover:underline">
                  Sign in now →
                </Link>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Account Type Selector */}
            <div>
              <label className={labelClass}>Account Type</label>
              <div className="grid grid-cols-2 gap-3">
                {ACCOUNT_TYPES.map((t) => {
                  const active = form.accountType === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => update("accountType", t.value)}
                      aria-pressed={active}
                      className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                        active
                          ? "bg-blue-50 border-blue-600 ring-1 ring-blue-600/30"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">{t.icon}</span>
                        <span className={`text-sm font-bold ${active ? "text-blue-800" : "text-[#0B1E3F]"}`}>
                          {t.label}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 leading-snug">{t.hint}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Name */}
            <div>
              <label htmlFor="name" className={labelClass}>Full Name</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
                  </svg>
                </div>
                <input
                  id="name"
                  type="text"
                  required
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Jane Doe"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className={labelClass}>Email Address</label>
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
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="name@firm.com"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Password + Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="password" className={labelClass}>Password</label>
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
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    placeholder="••••••••••"
                    className={`${inputClass} pr-14`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 px-3 text-xs font-semibold text-slate-500 hover:text-blue-700 transition-colors cursor-pointer"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className={labelClass}>Confirm Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/>
                    </svg>
                  </div>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={form.confirmPassword}
                    onChange={(e) => update("confirmPassword", e.target.value)}
                    placeholder="••••••••••"
                    className={`${inputClass} pr-14`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 px-3 text-xs font-semibold text-slate-500 hover:text-blue-700 transition-colors cursor-pointer"
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            </div>

            {/* ── Lawyer-only fields ─────────────────────────────── */}
            {form.accountType === "lawyer" && (
              <div className="space-y-5 p-4 rounded-xl bg-blue-50/60 border border-blue-100">
                <div className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider">
                  Lawyer Details
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="phone" className={labelClass}>Phone</label>
                    <input
                      id="phone"
                      type="tel"
                      required
                      autoComplete="tel"
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      placeholder="+94 77 123 4567"
                      className={plainInputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="qualification" className={labelClass}>Qualification</label>
                    <input
                      id="qualification"
                      type="text"
                      required
                      value={form.qualification}
                      onChange={(e) => update("qualification", e.target.value)}
                      placeholder="LLB, Attorney-at-Law"
                      className={plainInputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="experience" className={labelClass}>Years of Experience</label>
                    <input
                      id="experience"
                      type="number"
                      required
                      value={form.experience}
                      onChange={(e) => update("experience", e.target.value)}
                      placeholder="5"
                      className={plainInputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="licenseNumber" className={labelClass}>License Number</label>
                    <input
                      id="licenseNumber"
                      type="text"
                      required
                      value={form.licenseNumber}
                      onChange={(e) => update("licenseNumber", e.target.value)}
                      placeholder="BAR-2019-00452"
                      className={`${plainInputClass} font-mono`}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="description" className={labelClass}>Professional Description</label>
                  <textarea
                    id="description"
                    rows={3}
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    placeholder="Brief professional bio, practice areas, etc."
                    className={`${plainInputClass} resize-none`}
                  />
                </div>
              </div>
            )}

            {/* ── Clerk-only fields ──────────────────────────────── */}
            {form.accountType === "clerk" && (
              <div className="space-y-5 p-4 rounded-xl bg-blue-50/60 border border-blue-100">
                <div className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider">
                  Clerk Details
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="contact" className={labelClass}>Contact Number</label>
                    <input
                      id="contact"
                      type="tel"
                      required
                      value={form.contact}
                      onChange={(e) => update("contact", e.target.value)}
                      placeholder="+94 77 123 4567"
                      className={plainInputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="department" className={labelClass}>Department</label>
                    <input
                      id="department"
                      type="text"
                      required
                      value={form.department}
                      onChange={(e) => update("department", e.target.value)}
                      placeholder="Case Management"
                      className={plainInputClass}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              id="signup-submit"
              type="submit"
              disabled={loading}
              className="relative w-full mt-2 overflow-hidden group bg-gradient-to-r from-[#0B1E3F] to-[#1D4ED8] hover:from-[#0E2547] hover:to-[#1E46C4] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm py-3.5 px-4 rounded-xl shadow-md shadow-blue-900/10 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating account…</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
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
            <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Already have an account?</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Sign in link */}
          <Link
            to="/login"
            className="w-full block text-center py-3 rounded-xl border border-slate-300 text-sm font-semibold text-[#0B1E3F] hover:border-blue-600 hover:text-blue-700 hover:bg-blue-50/50 transition"
          >
            Sign In Instead
          </Link>

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