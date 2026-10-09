import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

const AboutSection = () => {
  return (
    <section id="about" className="bg-slate-50/60 py-20 lg:py-28 border-y border-slate-200/60">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        {/* Section Header with Accent Bar */}
        <div className="flex items-center gap-2 mb-10">
          <span className="h-6 w-1.5 rounded-full bg-emerald-500" />
          <h3 className="font-display text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            About Us:
          </h3>
        </div>

        {/* 2-Column Grid matching reference design */}
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Left Column: Image & Caption */}
          <div className="lg:col-span-4 flex flex-col items-start">
            <div className="relative w-full overflow-hidden rounded-2xl bg-slate-200 shadow-xl border border-slate-200/80 group">
              <img
                src="/careers1234.jpg"
                alt="About LegalEase Law Firm"
                className="h-[380px] w-full object-cover object-center transition-transform duration-500 group-hover:scale-105 sm:h-[430px]"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/careers/careers1234.jpg";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent opacity-60 group-hover:opacity-30 transition-opacity" />
            </div>
            <p className="mt-3 font-mono text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <span className="text-emerald-600 font-bold">_</span>LegalEase Headquarters & Chambers
            </p>
          </div>

          {/* Right Column: About Us Content */}
          <div className="lg:col-span-8 space-y-6 text-slate-700">
            <h4 className="font-display text-2xl font-semibold leading-snug text-slate-900 sm:text-3xl">
              Intro<span className="text-slate-400">___</span> where expertise meets dedication in guiding organizations through today’s complex legal and regulatory landscapes.
            </h4>

            <div className="space-y-5 text-base leading-relaxed sm:text-lg sm:leading-relaxed text-slate-600">
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

            {/* Link / CTA */}
            <div className="pt-4">
              <Link
                to="/about"
                className="inline-flex items-center gap-2 font-display text-base font-semibold text-slate-900 hover:text-emerald-700 transition-colors group"
              >
                More About Us
                <ArrowUpRight className="h-5 w-5 text-slate-800 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
