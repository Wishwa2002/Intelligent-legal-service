import React from "react";
import { ArrowRight, Scale, Shield, Building2, Users, Home, Globe, Briefcase } from "lucide-react";
import { Link } from "react-router-dom";

export const OurValuesServicesSection: React.FC = () => {
  const practiceAreasLeft = [
    {
      num: "01",
      title: "Corporate Law",
      description:
        "Our proven track record reflects our dedication, expertise, and commitment to achieving optimal outcomes for businesses.",
      highlighted: true,
      icon: Building2,
    },
    {
      num: "02",
      title: "Family Law",
      description: "Compassionate guidance through complex personal legal matters and estate governance.",
      highlighted: false,
      icon: Users,
    },
    {
      num: "03",
      title: "Criminal Defense",
      description: "Rigorous defense representation protecting constitutional rights and liberties.",
      highlighted: false,
      icon: Shield,
    },
  ];

  const practiceAreasRight = [
    {
      num: "04",
      title: "Real Estate Law",
      description: "Comprehensive legal management for commercial and residential property transactions.",
      highlighted: false,
      icon: Home,
    },
    {
      num: "05",
      title: "Immigration Law",
      description:
        "Our proven track record reflects our dedication, expertise, and commitment to achieving seamless global mobility.",
      highlighted: true,
      icon: Globe,
    },
    {
      num: "06",
      title: "Employment Law",
      description: "Strategic workplace compliance, dispute resolution, and labor policy advocacy.",
      highlighted: false,
      icon: Briefcase,
    },
  ];

  return (
    <section className="bg-slate-50/70 py-20 lg:py-28 border-b border-slate-200/70 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        {/* Section Header */}
        <div className="mb-14">
          <span className="font-mono text-xs uppercase tracking-widest text-[#b38f1d] font-bold">
            Our Value
          </span>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Driven by Justice, Guided by Values.
          </h2>
        </div>

        {/* 3-Column Grid Layout matching reference design */}
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-8">
          
          {/* Left Column Cards (01, 02, 03) */}
          <div className="lg:col-span-4 flex flex-col space-y-5">
            {practiceAreasLeft.map((item) => (
              <div
                key={item.num}
                className={`group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 ${
                  item.highlighted
                    ? "bg-[#D4AF37] text-navy-950 shadow-lg shadow-[#D4AF37]/30 hover:bg-[#c5a028]"
                    : "bg-white text-slate-800 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`font-mono text-xs font-semibold ${
                      item.highlighted ? "text-navy-950/80 font-bold" : "text-slate-400"
                    }`}
                  >
                    {item.num}
                  </span>
                  <item.icon
                    className={`h-5 w-5 ${
                      item.highlighted ? "text-navy-950" : "text-slate-400 group-hover:text-[#D4AF37]"
                    } transition-colors`}
                  />
                </div>
                <h3
                  className={`font-display text-xl font-bold tracking-tight mb-2 ${
                    item.highlighted ? "text-navy-950" : "text-slate-900"
                  }`}
                >
                  {item.title}
                </h3>
                {item.highlighted ? (
                  <p className="text-xs text-navy-950/90 leading-relaxed font-medium">
                    {item.description}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 leading-relaxed opacity-0 max-h-0 overflow-hidden group-hover:opacity-100 group-hover:max-h-20 transition-all duration-300">
                    {item.description}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Center Column: Middle Image (123qweA.png) */}
          <div className="lg:col-span-4 flex items-center justify-center my-4 lg:my-0">
            <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-slate-900 shadow-2xl border border-slate-200/60 group">
              <img
                src="/123qweA.png"
                alt="Justice and Practice Leadership"
                className="w-full h-auto object-cover object-center transition-transform duration-700 group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/careers/123qweA.png";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent opacity-40 group-hover:opacity-20 transition-opacity" />
            </div>
          </div>

          {/* Right Column Cards (04, 05, 06) */}
          <div className="lg:col-span-4 flex flex-col space-y-5">
            {practiceAreasRight.map((item) => (
              <div
                key={item.num}
                className={`group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 ${
                  item.highlighted
                    ? "bg-[#D4AF37] text-navy-950 shadow-lg shadow-[#D4AF37]/30 hover:bg-[#c5a028]"
                    : "bg-white text-slate-800 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`font-mono text-xs font-semibold ${
                      item.highlighted ? "text-navy-950/80 font-bold" : "text-slate-400"
                    }`}
                  >
                    {item.num}
                  </span>
                  <item.icon
                    className={`h-5 w-5 ${
                      item.highlighted ? "text-navy-950" : "text-slate-400 group-hover:text-[#D4AF37]"
                    } transition-colors`}
                  />
                </div>
                <h3
                  className={`font-display text-xl font-bold tracking-tight mb-2 ${
                    item.highlighted ? "text-navy-950" : "text-slate-900"
                  }`}
                >
                  {item.title}
                </h3>
                {item.highlighted ? (
                  <p className="text-xs text-navy-950/90 leading-relaxed font-medium">
                    {item.description}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 leading-relaxed opacity-0 max-h-0 overflow-hidden group-hover:opacity-100 group-hover:max-h-20 transition-all duration-300">
                    {item.description}
                  </p>
                )}
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
};

export default OurValuesServicesSection;
