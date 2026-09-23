import { ShieldCheck } from "lucide-react";

const HeroSection = () => {
  return (
    <section
      id="home"
      className="relative isolate overflow-hidden bg-navy-950 pt-32 pb-24 lg:pt-44 lg:pb-32"
    >
      {/* Background photograph */}
      <div className="absolute inset-0">
        <img
          src="/home-hero.jpg"
          alt="Statue of Lady Justice holding balanced scales"
          className="h-full w-full object-cover object-center"
          loading="eager"
        />
      </div>

      {/* Navy scrim — kept light enough that the photo stays clear. Only
          darkens toward the left, right behind the copy; the rest of the
          image is left mostly untouched. */}
      <div className="absolute inset-0 bg-gradient-to-r from-navy-950/85 via-navy-950/35 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-navy-950/50 via-transparent to-navy-950/20" />

      {/* Subtle texture + accent glow, unchanged from the dark theme */}
      <div className="pointer-events-none absolute inset-0 bg-ledger-lines opacity-[0.15]" />
      <div className="pointer-events-none absolute -left-40 top-1/4 h-96 w-96 rounded-full bg-gold/10 blur-3xl" />

      {/* Copy */}
      <div className="relative mx-auto max-w-7xl px-6 lg:px-10">
        <div className="max-w-2xl">
          <p className="mb-5 text-sm font-medium text-gold-light">
            A modern legal practice
          </p>
          <h1 className="font-display text-4xl font-semibold leading-[1.15] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)] sm:text-5xl lg:text-[3.4rem]">
            Trusted counsel, supported by intelligent technology
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-navy-100/90 drop-shadow-[0_1px_8px_rgba(0,0,0,0.4)]">
            Work with bar-certified attorneys across every major practice
            area. Our AI-assisted platform handles the groundwork — intake,
            scheduling, case matching — so your lawyer can focus on your
            case.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <a
              href="#services"
              className="rounded-md bg-gold px-7 py-3.5 text-center text-sm font-semibold text-navy-900 shadow-[0_8px_24px_-6px_rgba(212,175,55,0.5)] transition-colors hover:bg-gold-light"
            >
              Schedule a Consultation
            </a>
            <a
              href="/signup"
              className="rounded-md border border-white/25 px-7 py-3.5 text-center text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Explore Our Services
            </a>
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-x-10 gap-y-6 text-navy-100/60">
            <div>
              <p className="font-display text-2xl font-semibold text-white">500+</p>
              <p className="text-sm">Bar-certified attorneys</p>
            </div>
            <div className="hidden h-8 w-px bg-white/15 sm:block" />
            <div>
              <p className="font-display text-2xl font-semibold text-white">15,000+</p>
              <p className="text-sm">Cases handled</p>
            </div>
            <div className="hidden h-8 w-px bg-white/15 sm:block" />
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold-light">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <p className="text-sm">
                Verified &amp; bar-certified,
                <br className="hidden sm:block" /> every attorney
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
