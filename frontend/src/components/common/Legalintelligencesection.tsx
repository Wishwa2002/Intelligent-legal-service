import { Link } from "react-router-dom";
import { LEGAL_INTELLIGENCE_PATHS } from "../../features/legal-intelligence/paths";


const features = [
  {
    icon: "📜",
    title: "New Laws",
    description: "Acts, Bills, amendments and regulations",
  },
  {
    icon: "⚖️",
    title: "Court Cases",
    description: "Recent judgments and court decisions",
  },
  {
    icon: "📰",
    title: "Legal Updates",
    description: "Important legal developments in Sri Lanka",
  },
];

const LegalIntelligenceSection = () => {
  return (
    <section
      id="legal-intelligence"
      className="relative overflow-hidden bg-navy-900 py-24 lg:py-32"
    >
      <div className="pointer-events-none absolute left-0 top-0 h-96 w-96 rounded-full bg-gold/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-mono text-xs uppercase tracking-widest text-gold-light">
            Legal Intelligence
          </span>
          <h2 className="mt-3 font-display text-3xl font-semibold text-white sm:text-4xl">
            <span aria-hidden="true">⚖️ </span>Sri Lanka Legal Intelligence
          </h2>
          <p className="mt-4 text-navy-100/80">
            Stay informed about the latest laws, court decisions, and legal
            developments in Sri Lanka.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group flex flex-col rounded-2xl border border-white/10 bg-white/5 p-8 transition-all duration-300 hover:-translate-y-1 hover:border-gold/60 hover:bg-white/10"
            >
              <span
                aria-hidden="true"
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold/10 text-2xl transition-colors duration-300 group-hover:bg-gold/20"
              >
                {feature.icon}
              </span>
              <h3 className="mt-5 font-display text-xl font-semibold text-white">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm text-navy-100/80">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Link
            to={LEGAL_INTELLIGENCE_PATHS.home}
            className="inline-flex items-center gap-2 rounded-full bg-gold px-8 py-3.5 text-sm font-semibold text-navy-900 transition-all duration-300 hover:bg-gold-light focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-light focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900"
          >
            Explore Legal Intelligence
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default LegalIntelligenceSection;
