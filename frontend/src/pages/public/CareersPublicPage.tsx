import React, { useEffect, useState } from "react";
import {
  Globe,
  HeartHandshake,
  TrendingUp,
  Clock,
  GraduationCap,
  CheckCircle2,
  ArrowRight,
  X,
  Send,
  AlertCircle,
  Briefcase,
} from "lucide-react";
import Navbar from "../../components/common/Navbar";
import Footer from "../../components/common/Footer";
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

      const formattedName = applicantEmail.trim()
        ? `${applicantName.trim()} (${applicantEmail.trim()}${applicantPhone.trim() ? `, ${applicantPhone.trim()}` : ""})`
        : applicantName.trim();

      await careersApi.createApplication({
        careerId: Number(selectedCareer.careerId),
        applicantName: formattedName,
      });

      setSubmitSuccess(true);
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
    <div className="min-h-screen bg-paper font-sans text-navy-900 flex flex-col selection:bg-gold selection:text-navy-900">
      {/* Homepage Shared Navigation Header */}
      <Navbar />

      <main className="flex-1">
        {/* Hero Section matching Homepage Hero styling — career.jpg background clearly visible */}
        <section
          id="careers-hero"
          className="relative isolate overflow-hidden bg-navy-950 pt-32 pb-24 lg:pt-44 lg:pb-32"
        >
          {/* Background photograph (career.jpg) */}
          <div className="absolute inset-0">
            <img
              src="/career.jpg"
              alt="Careers at LegalEase Associates"
              className="h-full w-full object-cover object-center"
              loading="eager"
            />
          </div>

          {/* Scrim — light enough that the photo remains crisp and clearly visible.
              Softly darkens toward the left behind the text copy only. */}
          <div className="absolute inset-0 bg-gradient-to-r from-navy-950/85 via-navy-950/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-950/50 via-transparent to-navy-950/20" />

          {/* Subtle texture + warm accent glow from homepage theme */}
          <div className="pointer-events-none absolute inset-0 bg-ledger-lines opacity-[0.15]" />
          <div className="pointer-events-none absolute -left-40 top-1/4 h-96 w-96 rounded-full bg-gold/10 blur-3xl" />

          {/* Copy Container */}
          <div className="relative mx-auto max-w-7xl px-6 lg:px-10">
            <div className="max-w-2xl">
              <p className="mb-4 text-sm font-medium text-gold-light tracking-wide uppercase">
                Careers at LegalEase
              </p>

              {/* Exact user requested headline */}
              <h1 className="font-display text-4xl font-semibold leading-[1.15] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)] sm:text-5xl lg:text-[3.4rem]">
                Join our <span className="text-gold-light">team</span>
              </h1>

              {/* Exact user requested description */}
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-navy-100/90 drop-shadow-[0_1px_8px_rgba(0,0,0,0.4)]">
                Discover exciting career opportunities at LegalEase Associates and rapidly rise up the ladder in your legal career. We offer a global outlook, a supportive work environment, and a fulfilling career pathway.
              </p>

              {/* Exact user requested CTA directive */}
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <a
                  href="#openings"
                  className="rounded-md bg-gold px-7 py-3.5 text-center text-sm font-semibold text-navy-900 shadow-[0_8px_24px_-6px_rgba(212,175,55,0.5)] transition-colors hover:bg-gold-light inline-flex items-center justify-center gap-2"
                >
                  <span>Explore our current openings below</span>
                  <span>↓</span>
                </a>
              </div>

              {/* 3 Core Value Pillars */}
              <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-white/15 pt-8">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold-light">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Global Outlook</p>
                    <p className="text-xs text-navy-100/70 mt-0.5">International advisory</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold-light">
                    <HeartHandshake className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Supportive Work</p>
                    <p className="text-xs text-navy-100/70 mt-0.5">Mentorship & balance</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold-light">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Fulfilling Pathway</p>
                    <p className="text-xs text-navy-100/70 mt-0.5">Accelerated promotion</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Current Openings Section — clean paper background, matching ServicesSection */}
        <section id="openings" className="bg-paper py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            {/* Header & Filter Controls */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-navy-100">
              <div>
                <span className="font-mono text-xs uppercase tracking-widest text-gold-dark">
                  What We Offer
                </span>
                <h2 className="mt-2 font-display text-3xl font-semibold text-navy-900 sm:text-4xl">
                  Current Open Positions
                </h2>
                <p className="mt-2 text-sm text-slate-soft max-w-xl">
                  Discover career opportunities with LegalEase Associates. Select an opening below to review qualifications and apply.
                </p>
              </div>

              {/* Department Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {departments.map((dept) => (
                  <button
                    key={dept}
                    onClick={() => setDepartmentFilter(dept)}
                    className={`text-xs font-semibold px-4 py-2 rounded-lg border transition-all ${
                      departmentFilter === dept
                        ? "bg-navy-900 text-gold-light border-navy-900 shadow-sm"
                        : "bg-white text-navy-700 border-navy-200 hover:border-gold hover:text-navy-900"
                    }`}
                  >
                    {dept === "ALL" ? "All Departments" : dept}
                  </button>
                ))}
              </div>
            </div>

            {/* Content State: Loading / Error / Empty / Grid */}
            {loading ? (
              <div className="text-center py-24">
                <div className="w-10 h-10 border-3 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm text-slate-soft">Loading available career postings…</p>
              </div>
            ) : error ? (
              <div className="max-w-md mx-auto my-16 bg-white border border-rose-200 text-rose-700 text-xs p-6 rounded-2xl text-center shadow-sm">
                <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
                <p className="font-semibold mb-3">{error}</p>
                <button
                  onClick={fetchCareers}
                  className="text-xs font-semibold text-white bg-navy-900 hover:bg-gold hover:text-navy-900 px-4 py-2 rounded-lg transition"
                >
                  Retry Loading
                </button>
              </div>
            ) : filteredCareers.length === 0 ? (
              <div className="text-center py-20 bg-white border border-dashed border-navy-200 rounded-2xl my-10 max-w-2xl mx-auto p-8 shadow-sm">
                <Briefcase className="w-12 h-12 text-navy-400 mx-auto mb-3" />
                <h3 className="text-lg font-display font-semibold text-navy-900">No Openings Found</h3>
                <p className="text-sm text-slate-soft mt-1 max-w-sm mx-auto">
                  There are currently no job postings in this department category.
                </p>
                <button
                  onClick={() => setDepartmentFilter("ALL")}
                  className="mt-4 text-xs font-semibold text-navy-900 hover:text-gold-dark underline"
                >
                  View all openings →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
                {filteredCareers.map((career, idx) => {
                  const meta = getRoleMeta(career.jobTitle);
                  const roleImg = getRoleImage(career.jobTitle, idx);

                  return (
                    <div
                      key={career.careerId}
                      className="group relative rounded-2xl border border-navy-100 bg-white overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:border-gold/50 hover:shadow-[0_20px_40px_-16px_rgba(15,23,42,0.12)] flex flex-col justify-between"
                    >
                      <div>
                        {/* High Quality Role Banner */}
                        <div className="relative h-56 w-full overflow-hidden bg-navy-50">
                          <img
                            src={roleImg}
                            alt={career.jobTitle}
                            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-navy-900/60 via-transparent to-transparent" />

                          {/* Floating Department Badge */}
                          <div className="absolute top-4 left-4">
                            <span className="text-xs font-semibold px-3 py-1 rounded-md bg-white/95 backdrop-blur-sm text-navy-900 border border-navy-100 shadow-sm">
                              {meta.dept}
                            </span>
                          </div>

                          {/* Location Badge */}
                          <div className="absolute top-4 right-4">
                            <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-navy-900/80 backdrop-blur-sm text-white">
                              📍 {meta.location}
                            </span>
                          </div>

                          {/* Applicants Count */}
                          <div className="absolute bottom-3 right-4 text-xs font-medium text-white/90 bg-navy-950/70 backdrop-blur-sm px-2.5 py-0.5 rounded">
                            👥 {career.applicationsCount} applicants
                          </div>
                        </div>

                        {/* Card Information */}
                        <div className="p-7">
                          <h3 className="font-display text-xl font-semibold text-navy-900 group-hover:text-gold-dark transition-colors">
                            {career.jobTitle}
                          </h3>

                          {/* Badges */}
                          <div className="flex flex-wrap items-center gap-2 mt-3 mb-4">
                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded bg-navy-50 text-navy-700 border border-navy-100">
                              <Clock className="w-3.5 h-3.5 text-navy-400" />
                              {meta.type}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded bg-navy-50 text-navy-700 border border-navy-100">
                              <GraduationCap className="w-3.5 h-3.5 text-navy-400" />
                              {meta.exp}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Actively Recruiting
                            </span>
                          </div>

                          {/* Description */}
                          <p className="text-sm leading-relaxed text-slate-soft line-clamp-4 whitespace-pre-line border-l-2 border-gold/40 pl-3.5">
                            {career.description}
                          </p>
                        </div>
                      </div>

                      {/* Card Bottom CTA */}
                      <div className="px-7 pb-7 pt-4 border-t border-navy-100/80 flex items-center justify-between">
                        <span className="text-xs text-navy-400 font-mono">
                          Ref #{career.careerId}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleOpenApply(career)}
                          className="rounded-md bg-gold px-5 py-2.5 text-xs font-semibold text-navy-900 shadow-sm transition-colors hover:bg-gold-light inline-flex items-center gap-1.5"
                        >
                          <span>Apply for Role</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Application Modal — Clean white & gold legal styling, no black theme */}
        {selectedCareer && (
          <div className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white border border-navy-100 rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative my-8 text-navy-900">
              <button
                onClick={handleCloseModal}
                className="absolute top-5 right-5 text-navy-400 hover:text-navy-900 text-lg w-8 h-8 rounded-full bg-navy-50 flex items-center justify-center border border-navy-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {submitSuccess ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 text-2xl flex items-center justify-center mx-auto mb-4">
                    ✓
                  </div>
                  <h3 className="text-2xl font-display font-semibold text-navy-900 mb-2">
                    Application Submitted!
                  </h3>
                  <p className="text-sm text-slate-soft max-w-md mx-auto leading-relaxed mb-6">
                    Thank you, <span className="font-semibold text-navy-900">{applicantName}</span>. Your application for{" "}
                    <span className="font-semibold text-navy-900">{selectedCareer.jobTitle}</span> has been received. Our partners and talent committee will review your credentials shortly.
                  </p>
                  <div className="p-4 rounded-xl bg-navy-50 border border-navy-100 text-xs text-navy-700 max-w-sm mx-auto mb-6 text-left space-y-1">
                    <div className="font-mono text-gold-dark font-semibold">Status: Under Initial Review</div>
                    <div>Registry: Recorded in LegalEase Chambers Database</div>
                    <div>Position: {selectedCareer.jobTitle}</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="rounded-md bg-gold px-6 py-3 text-xs font-semibold text-navy-900 shadow-sm transition-colors hover:bg-gold-light"
                  >
                    Return to Open Careers
                  </button>
                </div>
              ) : (
                <div>
                  <div className="mb-6">
                    <span className="text-xs font-mono uppercase tracking-wider text-gold-dark font-medium block mb-1">
                      Direct Application
                    </span>
                    <h3 className="text-xl sm:text-2xl font-display font-semibold text-navy-900">
                      {selectedCareer.jobTitle}
                    </h3>
                    <p className="text-xs text-slate-soft mt-1">
                      Submit your credentials to our legal team and chambers management.
                    </p>
                  </div>

                  {submitError && (
                    <div className="mb-5 bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-xl flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                      <span className="flex-1">{submitError}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmitApplication} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-navy-900 uppercase tracking-wider mb-1.5">
                        Full Legal Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={applicantName}
                        onChange={(e) => setApplicantName(e.target.value)}
                        placeholder="e.g. Attorney Sarah Fernando, LL.B"
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-navy-200 rounded-lg text-navy-900 placeholder:text-navy-400 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-navy-900 uppercase tracking-wider mb-1.5">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={applicantEmail}
                          onChange={(e) => setApplicantEmail(e.target.value)}
                          placeholder="sarah.fernando@law.lk"
                          className="w-full px-3.5 py-2.5 text-sm bg-white border border-navy-200 rounded-lg text-navy-900 placeholder:text-navy-400 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-navy-900 uppercase tracking-wider mb-1.5">
                          Contact Phone
                        </label>
                        <input
                          type="text"
                          value={applicantPhone}
                          onChange={(e) => setApplicantPhone(e.target.value)}
                          placeholder="+94 77 123 4567"
                          className="w-full px-3.5 py-2.5 text-sm bg-white border border-navy-200 rounded-lg text-navy-900 placeholder:text-navy-400 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-navy-900 uppercase tracking-wider mb-1.5">
                        Statement of Interest / Experience Summary
                      </label>
                      <textarea
                        rows={4}
                        value={coverNote}
                        onChange={(e) => setCoverNote(e.target.value)}
                        placeholder="Briefly describe your legal or technical background, bar admissions, or documentation experience..."
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-navy-200 rounded-lg text-navy-900 placeholder:text-navy-400 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                      />
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        className="px-4 py-2.5 text-xs font-semibold text-navy-600 hover:text-navy-900 bg-navy-50 hover:bg-navy-100 rounded-lg transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-md bg-gold px-6 py-2.5 text-xs font-semibold text-navy-900 shadow-sm transition-colors hover:bg-gold-light inline-flex items-center gap-2 disabled:opacity-50"
                      >
                        {submitting ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
                            <span>Submitting…</span>
                          </>
                        ) : (
                          <>
                            <span>Submit Application</span>
                            <Send className="w-3.5 h-3.5" />
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
      </main>

      {/* Shared Homepage Footer */}
      <Footer />
    </div>
  );
};
