import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Scale,
  FileText,
  Building2,
  Users,
  ShieldCheck,
  Sparkles,
  Search,
  ChevronRight,
  ArrowRight,
  Clock,
  CheckCircle2,
  HelpCircle,
  Briefcase,
  FileCheck,
  Layers,
  Gavel,
  BadgeCheck,
  Send,
} from "lucide-react";
import Navbar from "../../components/common/Navbar";
import Footer from "../../components/common/Footer";

interface ServiceItem {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  description: string;
  deliverables: string[];
  turnaround: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
}

const CATEGORIES = [
  "ALL",
  "Corporate & Commercial",
  "Documentation & Clerk Services",
  "Dispute & Litigation",
  "Property & Real Estate",
  "Family & Personal",
  "AI & Automated LegalTech",
];

const SERVICES_DATA: ServiceItem[] = [
  {
    id: "corp-1",
    category: "Corporate & Commercial",
    title: "Company Formation & Registration",
    subtitle: "Complete business registration and corporate structuring.",
    description:
      "Full assistance with Registrar of Companies (ROC) filings, drafting Articles of Association, share capital structures, and tax registration for Sri Lankan and offshore entities.",
    deliverables: [
      "Certificate of Incorporation & Form 1 / Form 18",
      "Articles of Association custom drafting",
      "Company Secretary appointment & compliance setup",
    ],
    turnaround: "3 - 5 Business Days",
    badge: "Most Popular",
    icon: Building2,
    accentColor: "emerald",
  },
  {
    id: "doc-1",
    category: "Documentation & Clerk Services",
    title: "Legal Contract Drafting & Review",
    subtitle: "Custom agreement drafting tailored to Sri Lankan law.",
    description:
      "Expert drafting and legal risk auditing for NDAs, employment agreements, vendor contracts, service agreements, and commercial leases.",
    deliverables: [
      "Comprehensive legal risk assessment report",
      "Custom clauses protecting business interests",
      "Digital verification & signature-ready final copy",
    ],
    turnaround: "24 - 48 Hours",
    badge: "Fast Turnaround",
    icon: FileText,
    accentColor: "gold",
  },
  {
    id: "ai-1",
    category: "AI & Automated LegalTech",
    title: "AI Smart Legal Document Audit",
    subtitle: "Automated clause analysis and compliance verification.",
    description:
      "Powered by LegalEase AI Agent. Upload any draft contract to instantly identify missing compliance clauses, risky terms, and statutory mismatches before signing.",
    deliverables: [
      "Instant AI compliance score & risk breakdown",
      "Suggested replacement text for high-risk clauses",
      "Automated summary in plain English",
    ],
    turnaround: "Instant (< 2 Minutes)",
    badge: "AI Powered",
    icon: Sparkles,
    accentColor: "indigo",
  },
  {
    id: "lit-1",
    category: "Dispute & Litigation",
    title: "Civil & Commercial Dispute Representation",
    subtitle: "High-stakes litigation and arbitration advocacy.",
    description:
      "Representation before District Courts, High Courts, and Commercial Arbitration panels for breach of contract, debt recovery, and shareholder disputes.",
    deliverables: [
      "Pre-litigation legal notice & strategy memo",
      "Court filings, plaints, and defense submissions",
      "Experienced Senior Counsel advocacy at hearings",
    ],
    turnaround: "Case Specific Schedule",
    badge: "Senior Counsel",
    icon: Gavel,
    accentColor: "navy",
  },
  {
    id: "prop-1",
    category: "Property & Real Estate",
    title: "Property Title Search & Deed Transfer",
    subtitle: "Land registry searches, conveyancing, and deed execution.",
    description:
      "Thorough title search at the Land Registry, preparation of Deeds of Transfer, Deeds of Gift, Mortgages, and verification of encumbrance-free titles.",
    deliverables: [
      "Extract of encumbrances & title report from Registry",
      "Notarized Deed of Transfer & Plan registration",
      "Local authority clearance & stamp duty assessment",
    ],
    turnaround: "3 - 7 Business Days",
    badge: "Notarized",
    icon: Layers,
    accentColor: "amber",
  },
  {
    id: "doc-2",
    category: "Documentation & Clerk Services",
    title: "Power of Attorney & Affidavit Certification",
    subtitle: "Official notary public attestation and clerk registry processing.",
    description:
      "Official preparation and attestation of General/Special Powers of Attorney, sworn affidavits for court or official usage, and identity verifications.",
    deliverables: [
      "Official Notary Public attested document",
      "Registry entry & duplicate filing with Registrar General",
      "Certified true copies for official institutions",
    ],
    turnaround: "24 Hours",
    badge: "Express Notary",
    icon: FileCheck,
    accentColor: "emerald",
  },
  {
    id: "fam-1",
    category: "Family & Personal",
    title: "Wills, Estates & Probate Administration",
    subtitle: "Estate planning, testament drafting, and probate court filings.",
    description:
      "Comprehensive estate planning to safeguard family wealth. Drafting Last Wills, Testamentary trusts, and petitioning court for Letters of Administration.",
    deliverables: [
      "Confidential Last Will & Testament drafting",
      "Filing Testamentary Proceedings in District Court",
      "Estate asset inventory & distribution management",
    ],
    turnaround: "Confidential Consultation",
    badge: "Personal Asset Care",
    icon: Users,
    accentColor: "rose",
  },
  {
    id: "corp-2",
    category: "Corporate & Commercial",
    title: "Intellectual Property & Trademark Registration",
    subtitle: "Protecting brand names, logos, patents, and copyrights.",
    description:
      "Filing trademark applications with the National Intellectual Property Office (NIPO), handling opposition proceedings, and IP licensing agreements.",
    deliverables: [
      "NIPO trademark search & clearance report",
      "Formal Application filing & Journal publication tracking",
      "Final Certificate of Trademark Registration",
    ],
    turnaround: "Milestone Tracked",
    badge: "NIPO Registered",
    icon: BadgeCheck,
    accentColor: "cyan",
  },
  {
    id: "ai-2",
    category: "AI & Automated LegalTech",
    title: "AI Lawyer Recommendation & Matching",
    subtitle: "Instant match with top legal specialists based on case details.",
    description:
      "Our AI engine analyzes your specific legal requirement, budget, and location to automatically match you with verified lawyers possessing the exact domain expertise.",
    deliverables: [
      "Curated list of 3 top-rated legal specialists",
      "Transparent fee estimates & court track record",
      "Instant 1-click consultation booking",
    ],
    turnaround: "Instant Match",
    badge: "AI Recommended",
    icon: Scale,
    accentColor: "indigo",
  },
];

const FAQS = [
  {
    q: "How do I submit a legal documentation or clerk service request?",
    a: "You can click on any 'Request Service' button or navigate to 'My Requests' after logging in. Simply upload your draft document or requirements, and our clerk & legal team will begin processing immediately.",
  },
  {
    q: "Are the notary public services and court documents legally valid across Sri Lanka?",
    a: "Yes. All deeds, affidavits, and powers of attorney are attested by licensed Notaries Public & Commissioners for Oaths enrolled in the Supreme Court of Sri Lanka.",
  },
  {
    q: "How fast will a lawyer respond to my consultation booking?",
    a: "Our standard response window is under 24 hours. For urgent documentation or bail matters, our express clerk desk responds within 2 hours during business hours.",
  },
  {
    q: "How does the AI Smart Legal Document Audit work?",
    a: "Our proprietary AI engine scans your contract against Sri Lankan statutory frameworks, flagging missing indemnities, ambiguous penalty clauses, and non-compliant terms in real-time.",
  },
];

export const ServicesPublicPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const filteredServices = SERVICES_DATA.filter((s) => {
    const matchesCategory =
      activeCategory === "ALL" || s.category === activeCategory;
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.subtitle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-paper font-sans text-navy-900 flex flex-col selection:bg-gold selection:text-navy-900">
      <Navbar />

      <main className="flex-1">
        {/* =========================================================
            HERO HEADER BANNER WITH BACKGROUND IMAGE
        ========================================================= */}
        <section className="relative isolate overflow-hidden bg-navy-950 py-24 text-white lg:py-36">
          {/* Background photograph (careers1213232.jpg) */}
          <div className="absolute inset-0">
            <img
              src="/careers1213232.jpg"
              alt="Legal Services & Practice Areas"
              className="h-full w-full object-cover object-center"
              loading="eager"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/careers/careers1213232.jpg";
              }}
            />
          </div>

          {/* Scrim matching About Page main image */}
          <div className="absolute inset-0 bg-gradient-to-r from-navy-950/90 via-navy-950/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-950/70 via-transparent to-navy-950/30" />
          <div className="pointer-events-none absolute inset-0 bg-ledger-lines opacity-[0.15]" />
          <div className="pointer-events-none absolute -left-40 top-1/4 h-96 w-96 rounded-full bg-gold/15 blur-3xl" />

          <div className="relative mx-auto max-w-7xl px-6 lg:px-10">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 font-mono text-xs text-navy-200/90 uppercase tracking-widest mb-6">
              <Link to="/" className="hover:text-gold-light transition-colors">
                Home
              </Link>
              <ChevronRight size={12} />
              <span className="text-gold-light font-semibold">Services</span>
            </div>

            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-gold/20 px-3.5 py-1 text-xs font-semibold tracking-wide text-gold-light border border-gold/40 mb-6 backdrop-blur-md">
                <ShieldCheck size={14} /> 25+ Years of Legal Heritage & Modern Automation
              </div>

              <h1 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl leading-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
                Our Practice & <span className="text-gold-light">Legal Services</span>
              </h1>

              <p className="mt-6 text-lg text-navy-100 leading-relaxed sm:text-xl drop-shadow-[0_1px_8px_rgba(0,0,0,0.4)]">
                From corporate structuring and AI document verification to litigation advocacy and notary services — tailored to protect your interests.
              </p>

              {/* Action Links */}
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                <a
                  href="#services-grid"
                  className="rounded-md bg-gold px-7 py-3.5 text-center text-sm font-semibold text-navy-900 shadow-[0_8px_24px_-6px_rgba(212,175,55,0.5)] transition-colors hover:bg-gold-light inline-flex items-center justify-center gap-2"
                >
                  <span>Browse All Practice Areas</span>
                  <ArrowRight size={16} />
                </a>
                <Link
                  to="/my-requests/new"
                  className="rounded-md border border-white/30 bg-white/10 backdrop-blur-md px-7 py-3.5 text-center text-sm font-semibold text-white transition-colors hover:bg-white/20 inline-flex items-center justify-center gap-2"
                >
                  <Send size={16} />
                  <span>Submit Service Request</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            SEARCH & CATEGORY FILTER TABS
        ========================================================= */}
        <section id="services-grid" className="py-12 bg-slate-50/80 border-b border-slate-200">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              
              {/* Category Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold tracking-wide transition-all ${
                      activeCategory === cat
                        ? "bg-navy-900 text-gold-light shadow-md"
                        : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-100/70"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative w-full lg:w-72 shrink-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full border border-slate-200 bg-white pl-10 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-900"
                />
              </div>

            </div>
          </div>
        </section>

        {/* =========================================================
            SERVICES GRID
        ========================================================= */}
        <section className="py-16 lg:py-24 bg-white">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            
            {filteredServices.length === 0 ? (
              <div className="text-center py-16 rounded-2xl bg-slate-50 border border-slate-200">
                <HelpCircle className="mx-auto h-12 w-12 text-slate-400 mb-3" />
                <h3 className="font-display text-lg font-bold text-slate-900">No matching legal services found</h3>
                <p className="text-xs text-slate-500 mt-1">Try clearing your search query or selecting another category.</p>
                <button
                  onClick={() => {
                    setActiveCategory("ALL");
                    setSearchQuery("");
                  }}
                  className="mt-4 rounded-md bg-navy-900 px-4 py-2 text-xs font-semibold text-white"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredServices.map((service) => {
                  const IconComp = service.icon;
                  return (
                    <div
                      key={service.id}
                      className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-gold/50"
                    >
                      <div>
                        {/* Top Badge & Category */}
                        <div className="flex items-center justify-between gap-2 mb-4">
                          <span className="font-mono text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                            {service.category}
                          </span>
                          <span className="rounded-full bg-navy-50 px-2.5 py-0.5 font-mono text-[10px] font-bold text-navy-900 border border-navy-100">
                            {service.badge}
                          </span>
                        </div>

                        {/* Icon & Title */}
                        <div className="flex items-center gap-3.5 mb-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-gold-light transition-colors group-hover:bg-gold group-hover:text-navy-900">
                            <IconComp className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="font-display text-lg font-bold text-navy-900 leading-snug group-hover:text-navy-900">
                              {service.title}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">{service.subtitle}</p>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed my-4">
                          {service.description}
                        </p>

                        {/* Deliverables Checklist */}
                        <div className="space-y-2 border-t border-slate-100 pt-4 mb-6">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Key Deliverables
                          </p>
                          {service.deliverables.map((deliv, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              <span>{deliv}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Footer Info & Action */}
                      <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span>{service.turnaround}</span>
                        </div>

                        <Link
                          to="/my-requests/new"
                          className="inline-flex items-center gap-1 rounded-md bg-navy-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-gold hover:text-navy-900"
                        >
                          <span>Request</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </section>

        {/* =========================================================
            AI FEATURED TECH BANNER
        ========================================================= */}
        <section className="py-16 bg-navy-950 text-white relative overflow-hidden">
          <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-gold/10 blur-3xl" />
          <div className="mx-auto max-w-7xl px-6 lg:px-10 relative">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold text-gold-light border border-gold/30">
                  <Sparkles size={14} /> LegalEase Agentic AI Integration
                </div>
                <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
                  Automated Legal Verification & AI Smart Matching
                </h2>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                  Our platform combines senior legal experience with cutting-edge AI. Get instant document risk audits, automated category routing, and precision lawyer matching in seconds.
                </p>
                <div className="pt-2 flex flex-wrap gap-4">
                  <Link
                    to="/login"
                    className="rounded-md bg-gold px-6 py-3 text-xs font-bold text-navy-900 hover:bg-gold-light transition-all"
                  >
                    Try AI Smart Verification
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-md space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gold/20 flex items-center justify-center text-gold">
                      <ShieldCheck size={22} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">99.4% Compliance Accuracy</p>
                      <p className="text-xs text-slate-400">Trained on Sri Lankan Statutory Frameworks</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Clock size={22} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">24/7 Processing Desk</p>
                      <p className="text-xs text-slate-400">Instant AI audits & priority clerk dispatch</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* =========================================================
            FAQ ACCORDION
        ========================================================= */}
        <section className="py-20 bg-slate-50/70 border-t border-slate-200">
          <div className="mx-auto max-w-4xl px-6">
            <div className="text-center mb-12">
              <span className="font-mono text-xs uppercase tracking-widest text-gold-dark font-semibold">
                Client Guidance
              </span>
              <h2 className="mt-2 font-display text-3xl font-bold text-navy-900">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-4">
              {FAQS.map((faq, idx) => (
                <div
                  key={idx}
                  className="rounded-xl bg-white border border-slate-200/80 shadow-sm overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full flex items-center justify-between p-5 text-left font-display text-base font-bold text-slate-900 hover:text-navy-900"
                  >
                    <span>{faq.q}</span>
                    <span className="text-gold font-mono text-lg ml-4">
                      {openFaq === idx ? "−" : "+"}
                    </span>
                  </button>
                  {openFaq === idx && (
                    <div className="px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =========================================================
            FINAL CTA
        ========================================================= */}
        <section className="bg-navy-900 py-16 text-white">
          <div className="mx-auto max-w-7xl px-6 lg:px-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
                Need Custom Legal Guidance for Your Business?
              </h2>
              <p className="mt-2 text-slate-300 text-sm sm:text-base">
                Our legal team and automated desk are ready to assist you today.
              </p>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <Link
                to="/my-requests/new"
                className="inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-3.5 text-sm font-bold text-navy-900 shadow-lg hover:bg-gold-light transition-all"
              >
                Start Request Now <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ServicesPublicPage;
