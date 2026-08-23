type Service = {
  title: string;
  description: string;
  icon: JSX.Element;
};

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const services: Service[] = [
  {
    title: "Lawyer Consultation",
    description:
      "Connect with experienced lawyers for professional legal advice.",
    icon: (
      <svg {...iconProps} className="h-6 w-6">
        <path d="M16 3.13a4 4 0 010 7.75M12 14a5 5 0 00-5 5v1h14v-1a5 5 0 00-5-5zM9 7a4 4 0 118 0 4 4 0 01-8 0z" />
      </svg>
    ),
  },
  {
    title: "Legal Documentation",
    description:
      "Get assistance with contracts, agreements, and legal documents.",
    icon: (
      <svg {...iconProps} className="h-6 w-6">
        <path d="M9 12h6M9 16h6M9 8h1M6 3h9l5 5v12a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z" />
      </svg>
    ),
  },
  {
    title: "Appointment Management",
    description: "Book and manage consultations easily.",
    icon: (
      <svg {...iconProps} className="h-6 w-6">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4M8 15l2.5 2.5L16 12" />
      </svg>
    ),
  },
  {
    title: "AI Lawyer Recommendation",
    description:
      "Our AI agent helps match your needs with suitable lawyers.",
    icon: (
      <svg {...iconProps} className="h-6 w-6">
        <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
        <circle cx="12" cy="12" r="5" />
      </svg>
    ),
  },
];

const ServicesSection = () => {
  return (
    <section id="services" className="bg-paper py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-mono text-xs uppercase tracking-widest text-gold-dark">
            What We Offer
          </span>
          <h2 className="mt-3 font-display text-3xl font-semibold text-navy-900 sm:text-4xl">
            Legal services built around you
          </h2>
          <p className="mt-4 text-slate-soft">
            Everything you need to find, engage, and work with legal
            professionals&mdash;backed by intelligent automation.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service) => (
            <div
              key={service.title}
              className="group relative rounded-xl border border-navy-100 bg-white p-7 transition-all duration-300 hover:-translate-y-1.5 hover:border-gold/40 hover:shadow-[0_20px_40px_-16px_rgba(15,23,42,0.18)]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-navy-900 text-gold-light transition-colors duration-300 group-hover:bg-gold group-hover:text-navy-900">
                {service.icon}
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold text-navy-900">
                {service.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-soft">
                {service.description}
              </p>
              <div className="mt-5 h-px w-8 bg-gold/50 transition-all duration-300 group-hover:w-14" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
