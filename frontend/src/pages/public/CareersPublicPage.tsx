import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { careersApi, type Career } from "../../api/careersApi";

// Mapping of roles to high-resolution generated career images
const getRoleImage = (title: string, index = 0): string => {
  const lower = title.toLowerCase();
  if (lower.includes("corporate") || lower.includes("commercial")) {
    return "/careers/corporate_counsel.jpg";
  }
  if (lower.includes("clerk") || lower.includes("documentation") || lower.includes("operation")) {
    return "/careers/legal_clerk.jpg";
  }
  if (lower.includes("litigation") || lower.includes("dispute") || lower.includes("associate")) {
    return "/careers/litigation_associate.jpg";
  }
  if (lower.includes("ai") || lower.includes("intelligence") || lower.includes("engineer") || lower.includes("tech")) {
    return "/careers/ai_legal_tech.jpg";
  }
  const fallback = [
    "/careers/corporate_counsel.jpg",
    "/careers/legal_clerk.jpg",
    "/careers/litigation_associate.jpg",
    "/careers/ai_legal_tech.jpg",
  ];
  return fallback[index % fallback.length];
};

// Helper for department tags
const getRoleMeta = (title: string) => {
  const lower = title.toLowerCase();
  if (lower.includes("corporate")) {
    return { dept: "Corporate & M&A", type: "Full-Time", location: "Colombo / Hybrid", exp: "5+ Years" };
  }
  if (lower.includes("clerk") || lower.includes("documentation")) {
    return { dept: "Legal Operations", type: "Full-Time", location: "On-site / Legal Registry", exp: "1-3 Years" };
  }
  if (lower.includes("litigation") || lower.includes("dispute")) {
    return { dept: "Dispute Resolution", type: "Full-Time", location: "Supreme Court & Chamber", exp: "3+ Years" };
  }
  if (lower.includes("ai") || lower.includes("engineer")) {
    return { dept: "LegalTech & AI Labs", type: "Full-Time / Remote", location: "Remote / Tech Hub", exp: "2+ Years" };
  }
  return { dept: "Legal Services", type: "Full-Time", location: "Colombo HQ", exp: "Mid-Senior" };
};

export const CareersPublicPage: React.FC = () => {
  const [careers, setCareers] = useState<Career[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter
  const [departmentFilter, setDepartmentFilter] = useState("ALL");

  // Application Modal state
  const [selectedCareer, setSelectedCareer] = useState<Career | null>(null);
  const [applicantName, setApplicantName] = useState("");
  const [applicantEmail, setApplicantEmail] = useState("");
  const [applicantPhone, setApplicantPhone] = useState("");
  const [coverNote, setCoverNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetchCareers();
  }, []);

  const fetchCareers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await careersApi.getCareers();
      setCareers(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load open career opportunities.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenApply = (career: Career) => {
    setSelectedCareer(career);
    setApplicantName("");
    setApplicantEmail("");
    setApplicantPhone("");
    setCoverNote("");
    setSubmitSuccess(false);
    setSubmitError(null);
  };

  const handleCloseModal = () => {
    setSelectedCareer(null);
    setSubmitSuccess(false);
    setSubmitError(null);
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCareer) return;

    if (!applicantName.trim()) {
      setSubmitError("Please enter your full name.");
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      // Submit application to backend
      const formattedName = applicantEmail.trim()
        ? `${applicantName.trim()} (${applicantEmail.trim()}${applicantPhone.trim() ? `, ${applicantPhone.trim()}` : ""})`
        : applicantName.trim();

      await careersApi.createApplication({
        careerId: Number(selectedCareer.careerId),
        applicantName: formattedName,
      });

      setSubmitSuccess(true);
      // Refresh count in list
      fetchCareers();
    } catch (err: any) {
      setSubmitError(
        err.response?.data?.message ||
          err.message ||
          "Could not submit your application. Please check your connection and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const departments = ["ALL", ...Array.from(new Set(careers.map((c) => getRoleMeta(c.jobTitle).dept)))];

  const filteredCareers = careers.filter((c) => {
    if (departmentFilter === "ALL") return true;
    return getRoleMeta(c.jobTitle).dept === departmentFilter;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Ambient Lights */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[450px] bg-radial from-amber-500/10 via-slate-900/40 to-transparent pointer-events-none blur-3xl" />
      <div className="absolute top-80 right-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Navigation Header */}
      <header className="relative z-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 text-xl font-bold shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              ⚖️
            </div>
            <div>
              <span className="text-xl font-bold text-white font-serif tracking-tight block">
                LegalEase
              </span>
              <span className="text-[10px] font-semibold text-amber-400 tracking-wider uppercase block">
                Careers & Talent Portal
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              to="/clerk/login"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white px-3.5 py-2 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/60 transition"
            >
              <span>🏛️ Clerk Portal</span>
            </Link>
            <Link
              to="/admin"
              className="text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 px-4 py-2 rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5"
            >
              <span>Admin Console</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-16 pb-20 px-4 sm:px-6 lg:px-8 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-widest mb-6">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span>We're Hiring Legal Innovators</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-white tracking-tight leading-tight sm:leading-tight">
          Pioneer the Future of <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent">Modern Jurisprudence</span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
          Join our distinguished chambers and LegalTech teams. Whether you are an experienced counsel, 
          a meticulous legal documentation clerk, or an AI prompt specialist, discover impactful career opportunities with us.
        </p>

        {/* Highlight Metrics */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 backdrop-blur-sm">
            <div className="text-2xl font-bold font-serif text-amber-400">99.8%</div>
            <div className="text-xs text-slate-400 mt-1">Audit Precision</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 backdrop-blur-sm">
            <div className="text-2xl font-bold font-serif text-white">40+</div>
            <div className="text-xs text-slate-400 mt-1">Legal Clerks & Staff</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 backdrop-blur-sm">
            <div className="text-2xl font-bold font-serif text-amber-400">100%</div>
            <div className="text-xs text-slate-400 mt-1">Digital Workflows</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 backdrop-blur-sm">
            <div className="text-2xl font-bold font-serif text-white">Open</div>
            <div className="text-xs text-slate-400 mt-1">Equal Opportunity</div>
          </div>
        </div>
      </section>

      {/* Filter / Openings Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24" id="openings">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800 mb-10">
          <div>
            <h2 className="text-2xl font-serif font-bold text-white flex items-center gap-2">
              <span>💼</span>
              <span>Current Open Positions</span>
              <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700 ml-2">
                {filteredCareers.length} available
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select any opening below to review qualifications and apply directly online.
            </p>
          </div>

          {/* Department Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {departments.map((dept) => (
              <button
                key={dept}
                onClick={() => setDepartmentFilter(dept)}
                className={`text-xs font-semibold px-3.5 py-1.5 rounded-xl border transition-all ${
                  departmentFilter === dept
                    ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20"
                    : "bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white"
                }`}
              >
                {dept === "ALL" ? "All Departments" : dept}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-slate-400">Loading open career postings…</p>
          </div>
        ) : error ? (
          <div className="max-w-md mx-auto bg-rose-950/40 border border-rose-800 text-rose-300 text-xs p-6 rounded-2xl text-center">
            <p className="font-semibold mb-3">⚠️ {error}</p>
            <button
              onClick={fetchCareers}
              className="text-xs font-bold text-white bg-rose-900/60 hover:bg-rose-900 px-4 py-2 rounded-xl transition"
            >
              Retry Loading
            </button>
          </div>
        ) : filteredCareers.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl">
            <div className="text-3xl mb-2">📂</div>
            <h3 className="text-base font-semibold text-white">No Openings Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              There are currently no job postings matching your selected department filter.
            </p>
            <button
              onClick={() => setDepartmentFilter("ALL")}
              className="mt-4 text-xs font-bold text-amber-400 hover:underline"
            >
              View all openings →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filteredCareers.map((career, idx) => {
              const meta = getRoleMeta(career.jobTitle);
              const roleImg = getRoleImage(career.jobTitle, idx);

              return (
                <div
                  key={career.careerId}
                  className="bg-slate-900/80 border border-slate-800/90 rounded-3xl overflow-hidden hover:border-amber-500/40 transition-all duration-300 flex flex-col group hover:shadow-2xl hover:shadow-amber-500/5"
                >
                  {/* High Quality Generated Role Image */}
                  <div className="relative h-56 w-full overflow-hidden bg-slate-950">
                    <img
                      src={roleImg}
                      alt={career.jobTitle}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                    
                    {/* Floating Dept Badge */}
                    <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                      <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-amber-300 border border-amber-500/30 shadow-lg">
                        {meta.dept}
                      </span>
                    </div>

                    <div className="absolute top-4 right-4">
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-slate-300 border border-slate-700">
                        📍 {meta.location}
                      </span>
                    </div>

                    {/* Applications received count */}
                    <div className="absolute bottom-3 right-4 text-[11px] text-slate-300 bg-slate-950/70 backdrop-blur-sm px-2.5 py-0.5 rounded-lg border border-slate-800">
                      👥 {career.applicationsCount} applicants
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xl font-serif font-bold text-white group-hover:text-amber-300 transition-colors">
                        {career.jobTitle}
                      </h3>

                      {/* Pill tags */}
                      <div className="flex flex-wrap items-center gap-2 mt-3 mb-4">
                        <span className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                          ⏱️ {meta.type}
                        </span>
                        <span className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                          🎓 {meta.exp}
                        </span>
                        <span className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                          ✅ Actively Recruiting
                        </span>
                      </div>

                      {/* Description preview */}
                      <div className="text-xs text-slate-300 leading-relaxed line-clamp-4 whitespace-pre-line border-l-2 border-amber-500/40 pl-3">
                        {career.description}
                      </div>
                    </div>

                    {/* Bottom Action */}
                    <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-mono">
                        Ref #{career.careerId}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleOpenApply(career)}
                        className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
                      >
                        <span>Apply for Role</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Application Modal */}
      {selectedCareer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative my-8">
            <button
              onClick={handleCloseModal}
              className="absolute top-5 right-5 text-slate-400 hover:text-white text-lg w-8 h-8 rounded-full bg-slate-800/80 flex items-center justify-center border border-slate-700"
            >
              ✕
            </button>

            {submitSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-3xl flex items-center justify-center mx-auto mb-4">
                  ✓
                </div>
                <h3 className="text-2xl font-serif font-bold text-white mb-2">
                  Application Submitted!
                </h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed mb-6">
                  Thank you, <span className="font-semibold text-amber-300">{applicantName}</span>. Your credentials for the position of{" "}
                  <span className="font-semibold text-white">{selectedCareer.jobTitle}</span> have been registered. Our talent advisory and legal casework leads will review your application shortly.
                </p>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400 max-w-sm mx-auto mb-6 text-left">
                  <div className="font-mono text-amber-400 mb-1">Status: Under Review</div>
                  <div>Application ID: Recorded in Chamber Registry</div>
                  <div>Position: {selectedCareer.jobTitle}</div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-6 py-3 rounded-xl transition shadow-lg shadow-amber-500/20"
                >
                  Return to Open Careers
                </button>
              </div>
            ) : (
              <div>
                <div className="mb-6">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                    Direct Application Portal
                  </span>
                  <h3 className="text-xl sm:text-2xl font-serif font-bold text-white">
                    {selectedCareer.jobTitle}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Submit your details directly to our chambers hiring board.
                  </p>
                </div>

                {submitError && (
                  <div className="mb-5 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs p-3.5 rounded-xl flex items-start gap-2">
                    <span>⚠️</span>
                    <span className="flex-1">{submitError}</span>
                  </div>
                )}

                <form onSubmit={handleSubmitApplication} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Full Legal Name <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={applicantName}
                      onChange={(e) => setApplicantName(e.target.value)}
                      placeholder="e.g. Attorney Sarah Fernando, LL.B"
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={applicantEmail}
                        onChange={(e) => setApplicantEmail(e.target.value)}
                        placeholder="sarah.fernando@law.lk"
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Contact Phone
                      </label>
                      <input
                        type="text"
                        value={applicantPhone}
                        onChange={(e) => setApplicantPhone(e.target.value)}
                        placeholder="+94 77 123 4567"
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Statement of Interest / Experience Summary
                    </label>
                    <textarea
                      rows={4}
                      value={coverNote}
                      onChange={(e) => setCoverNote(e.target.value)}
                      placeholder="Briefly describe your legal or technical background, bar admissions, or documentation experience..."
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                          <span>Submitting Application…</span>
                        </>
                      ) : (
                        <>
                          <span>Submit Application</span>
                          <span>✓</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Public Page Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-base">⚖️</span>
            <span className="font-serif font-bold text-white">LegalEase Chambers & LegalTech</span>
            <span>• Empowering Legal Practitioners</span>
          </div>

          <div className="flex items-center gap-6 text-xs">
            <Link to="/login" className="hover:text-amber-400 transition">
              Staff & Clerk Login
            </Link>
            <Link to="/admin" className="hover:text-amber-400 transition">
              Admin Gateway
            </Link>
            <Link to="/" className="hover:text-amber-400 transition">
              Home
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
