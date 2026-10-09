import { Link } from "react-router-dom";
import {
  ShieldCheck,
  History,
  Building2,
  Sparkles,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import Navbar from "../../components/common/Navbar";
import Footer from "../../components/common/Footer";

export const AboutPublicPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Navbar />

      <main className="pt-20">
        {/* =========================================================
            HERO HEADER BANNER WITH MAIN IMAGE (careers1234.jpg)
        ========================================================= */}
        <section className="relative isolate overflow-hidden bg-navy-950 py-24 text-white lg:py-36">
          {/* Background photograph (careers1234.jpg) */}
          <div className="absolute inset-0">
            <img
              src="/careers1234.jpg"
              alt="About LegalEase Associates"
              className="h-full w-full object-cover object-center"
              loading="eager"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/careers/careers1234.jpg";
              }}
            />
          </div>

          {/* Gradient Scrim overlays — ensures image is crisp and clearly visible while keeping copy readable */}
          <div className="absolute inset-0 bg-gradient-to-r from-navy-950/90 via-navy-950/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-950/70 via-transparent to-navy-950/30" />
          <div className="pointer-events-none absolute inset-0 bg-ledger-lines opacity-[0.15]" />
          <div className="pointer-events-none absolute -left-40 top-1/4 h-96 w-96 rounded-full bg-gold/10 blur-3xl" />

          <div className="relative mx-auto max-w-7xl px-6 lg:px-10">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 font-mono text-xs text-navy-200/90 uppercase tracking-widest mb-6 drop-shadow-sm">
              <Link to="/" className="hover:text-gold-light transition-colors">Home</Link>
              <ChevronRight size={12} />
              <span className="text-gold-light font-semibold">About Us</span>
            </div>

            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-gold/20 px-3.5 py-1 text-xs font-semibold tracking-wide text-gold-light border border-gold/40 mb-6 backdrop-blur-md">
                <History size={14} /> Est. 1898 — Sri Lanka’s Premier Legal Heritage
              </div>

              <h1 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl leading-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
                About Our <span className="text-gold-light">Law Firm</span>
              </h1>

              <p className="mt-6 text-lg text-navy-100 leading-relaxed sm:text-xl drop-shadow-[0_1px_8px_rgba(0,0,0,0.4)]">
                Combining over a century of legal tradition with modern innovation, AI-assisted research, and dedicated client advocacy.
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================
            MAIN ABOUT SECTION: CEO & FIRM HISTORY
        ========================================================= */}
        <section className="py-20 lg:py-28 bg-white">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            
            {/* Section Tag */}
            <div className="flex items-center gap-2.5 mb-12">
              <span className="h-7 w-1.5 rounded-full bg-emerald-500" />
              <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                About Us:
              </h2>
            </div>

            {/* Grid Layout */}
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16 items-start">
              
              {/* Left Column: CEO / Executive Photo & Key Stats */}
              <div className="lg:col-span-5 flex flex-col items-start space-y-6">
                <div className="relative w-full overflow-hidden rounded-3xl bg-slate-100 shadow-2xl border border-slate-200/80 group">
                  <img
                    src="/careers1234.jpg"
                    alt="Senior Leadership & Partners"
                    className="h-[440px] w-full object-cover object-center transition-transform duration-500 group-hover:scale-105 sm:h-[480px]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/careers/careers1234.jpg";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent opacity-80" />
                  
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <span className="inline-block rounded-md bg-emerald-500/90 backdrop-blur-md px-2.5 py-1 font-mono text-[11px] font-semibold text-white uppercase tracking-wider mb-2">
                      Leadership
                    </span>
                    <h3 className="font-display text-xl font-bold text-white">Dhyan Hewage</h3>
                    <p className="text-xs text-slate-300 font-medium">Founder & Managing Senior Partner</p>
                  </div>
                </div>

                {/* Key Highlights Card */}
                <div className="w-full rounded-2xl bg-slate-900 p-6 text-white shadow-xl">
                  <div className="grid grid-cols-2 gap-4 divide-x divide-white/10">
                    <div className="pr-2">
                      <p className="font-display text-3xl font-bold text-gold">25+</p>
                      <p className="text-xs text-slate-400 mt-1 font-medium">Years of Legal Legacy</p>
                    </div>
                    <div className="pl-4">
                      <p className="font-display text-3xl font-bold text-emerald-400">10k+</p>
                      <p className="text-xs text-slate-400 mt-1 font-medium">Successful Client Matters</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Full History Text & Story */}
              <div className="lg:col-span-7 space-y-6 text-slate-700">
                <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-6 mb-4">
                  <h3 className="font-display text-xl font-bold text-navy-900 sm:text-2xl leading-snug">
                    Intro<span className="text-slate-400">___</span> where expertise meets dedication in guiding organizations through today’s complex legal and regulatory landscapes.
                  </h3>
                </div>

                <div className="space-y-5 text-base leading-relaxed text-slate-600 sm:text-lg sm:leading-relaxed">
                  <p className="font-medium text-slate-900">
                    A leading law firm in Sri Lanka with an impeccable reputation, LegalEase brings together a distinguished pool of experienced lawyers and modern legal technologists. Founded in 1998 by Dhyan Hewage, our firm was established on the principles of integrity, precision, and forward-thinking advocacy.
                  </p>

                  <p>
                    We understand that modern businesses operate in an era of rapid digital transformation and evolving regulatory standards, where continuous compliance is both a demanding challenge and a vital opportunity for sustainable growth.
                  </p>

                  <p>
                    LegalEase bridges this gap by merging decades of trusted legal counsel with cutting-edge autonomous AI agents. Our specialized AI agents work around the clock alongside our legal consultants to accelerate contract reviews, deliver rapid regulatory insights, and streamline compliance audits. This AI-augmented approach empowers our clients with real-time legal intelligence, reduced operational friction, and unparalleled precision.
                  </p>

                  <p>
                    Our mission is simple yet profound: to empower businesses with the tools, technological agility, and strategic insights required to thrive with complete confidence.
                  </p>

                  <p>
                    We go far beyond traditional advisory. We partner closely with our clients—combining senior human expertise with advanced AI capabilities to ensure you receive proactive, scalable legal support tailored to the commercial realities of your industry.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* =========================================================
            VALUES & PILLARS
        ========================================================= */}
        <section className="py-20 bg-slate-100/70 border-t border-slate-200">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="font-mono text-xs uppercase tracking-widest text-emerald-600 font-semibold">
                Our Foundation
              </span>
              <h2 className="mt-2 font-display text-3xl font-bold text-slate-900 sm:text-4xl">
                Guided by Integrity & Innovation
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow">
                <div className="h-12 w-12 rounded-xl bg-navy-900/10 flex items-center justify-center text-navy-900 mb-6">
                  <ShieldCheck size={26} />
                </div>
                <h3 className="font-display text-xl font-bold text-slate-900 mb-3">Integrity & Trust</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Upholding ethical practice and absolute confidentiality for over 120 years across corporate, civil, and regulatory matters.
                </p>
              </div>

              <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow">
                <div className="h-12 w-12 rounded-xl bg-gold/20 flex items-center justify-center text-navy-900 mb-6">
                  <Building2 size={26} />
                </div>
                <h3 className="font-display text-xl font-bold text-slate-900 mb-3">Corporate Excellence</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Specialized legal consulting empowering businesses, financial institutions, and individuals with confidence and clarity.
                </p>
              </div>

              <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow">
                <div className="h-12 w-12 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-700 mb-6">
                  <Sparkles size={26} />
                </div>
                <h3 className="font-display text-xl font-bold text-slate-900 mb-3">AI & Modern Tech</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Infusing cutting-edge AI verification and automated workflows to accelerate legal operations without compromising quality.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            CTA BANNER
        ========================================================= */}
        <section className="bg-navy-900 py-16 text-white">
          <div className="mx-auto max-w-7xl px-6 lg:px-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
                Ready to Consult with Our Experienced Legal Counsel?
              </h2>
              <p className="mt-2 text-slate-300 text-sm sm:text-base">
                Book a consultation or submit a documentation service request today.
              </p>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-3.5 text-sm font-bold text-navy-900 shadow-lg hover:bg-gold-light transition-all"
              >
                Get Started <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
